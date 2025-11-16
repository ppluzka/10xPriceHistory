import type { APIRoute } from "astro";
import { z } from "zod";

import { OfferService } from "../../lib/services/offer.service";
import { createOpenRouterServiceOrNull } from "../../lib/utils/openrouter";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

/**
 * Query parameters schema for GET /api/offers
 */
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(["created_at", "last_checked", "title"]).default("created_at"),
});

/**
 * Request body schema for POST /api/offers
 */
const AddOfferCommandSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((url) => url.includes("otomoto.pl"), {
      message: "URL must be from otomoto.pl domain",
    }),
});

/**
 * GET /api/offers
 * Returns paginated list of active offer subscriptions for the authenticated user
 */
export const GET: APIRoute = async ({ request, locals }) => {
  // Check if offers feature is enabled
  if (!isFeatureEnabled("offers")) {
    return new Response(
      JSON.stringify({
        error: "Funkcjonalność jest niedostępna",
        code: "FEATURE_DISABLED",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get user ID from middleware - validate authentication
    const currentUserId = locals.current_user_id;

    if (!currentUserId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    // Merge query string params with JSON body params (if any)
    const qp = {
      page: url.searchParams.get("page") ?? undefined,
      size: url.searchParams.get("size") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
    };
    let bodyParams: Partial<{ page: string; size: string; sort: string }> = {};
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        bodyParams = await request.json();
      } catch {
        bodyParams = {};
      }
    }
    const validationResult = QueryParamsSchema.safeParse({
      ...qp,
      ...bodyParams,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { page, size, sort } = validationResult.data;

    // Call service layer to get offers
    const openRouterService = createOpenRouterServiceOrNull({ locals });
    const offerService = new OfferService(locals.supabase, openRouterService ?? undefined);
    const result = await offerService.list(currentUserId, page, size, sort);

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in GET /api/offers:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/offers
 * Adds a new Otomoto.pl offer subscription for the authenticated user
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // Check if offers feature is enabled
  if (!isFeatureEnabled("offers")) {
    return new Response(
      JSON.stringify({
        error: "Funkcjonalność jest niedostępna",
        code: "FEATURE_DISABLED",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get user ID from middleware - validate authentication
    const currentUserId = locals.current_user_id;

    if (!currentUserId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Invalid JSON in request body",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = AddOfferCommandSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { url } = validationResult.data;

    // Call service layer to add offer
    const openRouterService = createOpenRouterServiceOrNull({ locals });
    const offerService = new OfferService(locals.supabase, openRouterService ?? undefined);
    const result = await offerService.add(currentUserId, url);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      // Check for rate limit errors (from database trigger)
      if (error.message.includes("Rate limit exceeded")) {
        return new Response(
          JSON.stringify({
            error: "Too Many Requests",
            details: error.message,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check for conflict errors (already subscribed)
      if (error.message.includes("already subscribed")) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            details: error.message,
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check for authentication errors
      if (
        error.message.includes("Authentication required") ||
        error.message.includes("User ID does not match") ||
        error.message.includes("No user session")
      ) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            details: error.message,
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check for validation/extraction errors
      if (
        error.message.includes("extraction failed") ||
        error.message.includes("Invalid URL") ||
        error.message.includes("Failed to fetch")
      ) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            details: error.message,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check for RLS/database errors
      if (
        error.message.includes("Failed to check subscription limit") ||
        error.message.includes("Failed to check existing offer") ||
        error.message.includes("PGRST") ||
        error.message.includes("permission denied")
      ) {
        console.error("Database/RLS error in POST /api/offers:", error);
        return new Response(
          JSON.stringify({
            error: "Internal Server Error",
            details: "Database operation failed. Please try again.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    console.error("Error in POST /api/offers:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
