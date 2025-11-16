import type { APIRoute } from "astro";
import { z } from "zod";

import { OfferService } from "../../../../lib/services/offer.service";
import { createOpenRouterService } from "../../../../lib/utils/openrouter";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

/**
 * Path parameter schema for /api/offers/{id}/history
 */
const IdParamSchema = z.coerce.number().int().positive();

/**
 * Query parameters schema for GET /api/offers/{id}/history
 */
const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(1000).default(10),
});

/**
 * GET /api/offers/{id}/history
 * Returns paginated price history for a specific offer
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Check if offerdetails feature is enabled
  if (!isFeatureEnabled("offerdetails")) {
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
    // Get user ID from middleware (using DEFAULT_USER_ID for now)
    const currentUserId = locals.current_user_id as string;

    // Validate offer ID parameter
    const idValidation = IdParamSchema.safeParse(params.id);

    if (!idValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Invalid offer ID: must be a positive integer",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const offerId = idValidation.data;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get("page") ?? undefined,
      size: url.searchParams.get("size") ?? undefined,
    };

    const queryValidation = QueryParamsSchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: queryValidation.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { page, size } = queryValidation.data;

    // Call service layer to get price history
    const offerService = new OfferService(locals.supabase, createOpenRouterService({ locals }));
    const result = await offerService.getHistory(currentUserId, offerId, page, size);

    // If offer not found or user not authorized, return 404
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          details: "Offer not found or you are not subscribed to this offer",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/offers/{id}/history:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
