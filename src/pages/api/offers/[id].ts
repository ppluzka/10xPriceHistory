import type { APIRoute } from "astro";
import { z } from "zod";

import { OfferService } from "../../../lib/services/offer.service";
import { OpenRouterService } from "../../../lib/openrouter.service";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

// Singleton instance for OpenRouter service
let openRouterService: OpenRouterService | null = null;

/**
 * Gets or creates OpenRouter service instance
 */
function getOpenRouterService(): OpenRouterService {
  if (!openRouterService) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    openRouterService = new OpenRouterService({
      apiKey,
      baseUrl: import.meta.env.OPENROUTER_BASE_URL,
      defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
      timeoutMs: import.meta.env.OPENROUTER_TIMEOUT_MS
        ? parseInt(import.meta.env.OPENROUTER_TIMEOUT_MS, 10)
        : undefined,
      maxRetries: import.meta.env.OPENROUTER_MAX_RETRIES
        ? parseInt(import.meta.env.OPENROUTER_MAX_RETRIES, 10)
        : undefined,
    });
  }

  return openRouterService;
}

/**
 * Path parameter schema for /api/offers/{id}
 */
const IdParamSchema = z.coerce.number().int().positive();

/**
 * GET /api/offers/{id}
 * Returns detailed information about a specific offer including price statistics
 */
export const GET: APIRoute = async ({ params, locals }) => {
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
    const validationResult = IdParamSchema.safeParse(params.id);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Invalid offer ID: must be a positive integer",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const offerId = validationResult.data;

    // Call service layer to get offer details
    const offerService = new OfferService(locals.supabase, getOpenRouterService());
    const result = await offerService.getById(currentUserId, offerId);

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
    console.error("Error in GET /api/offers/{id}:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/offers/{id}
 * Unsubscribes user from an offer (soft-delete)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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
    // Get user ID from middleware (using DEFAULT_USER_ID for now)
    const currentUserId = locals.current_user_id as string;

    // Validate offer ID parameter
    const validationResult = IdParamSchema.safeParse(params.id);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Invalid offer ID: must be a positive integer",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const offerId = validationResult.data;

    // Call service layer to unsubscribe
    const offerService = new OfferService(locals.supabase, getOpenRouterService());
    const success = await offerService.unsubscribe(currentUserId, offerId);

    // If offer not found or already unsubscribed, return 404
    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          details: "Offer not found or already unsubscribed",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE /api/offers/{id}:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
