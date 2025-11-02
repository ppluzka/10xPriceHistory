import type { APIRoute } from "astro";
import { z } from "zod";

import { PreferencesService } from "../../lib/services/preferences.service";

export const prerender = false;

/**
 * Request body schema for PUT /api/preferences
 */
const UpdatePreferencesSchema = z.object({
  defaultFrequency: z.enum(["6h", "12h", "24h", "48h"]),
});

/**
 * GET /api/preferences
 * Returns user's preferences (creates default if doesn't exist)
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get user ID from middleware (using DEFAULT_USER_ID for now)
    const currentUserId = locals.current_user_id as string;

    // Call service layer to get preferences
    const preferencesService = new PreferencesService(locals.supabase);
    const result = await preferencesService.get(currentUserId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/preferences:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/preferences
 * Updates user's preferences
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    // Get user ID from middleware (using DEFAULT_USER_ID for now)
    const currentUserId = locals.current_user_id as string;

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

    const validationResult = UpdatePreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { defaultFrequency } = validationResult.data;

    // Call service layer to update preferences
    const preferencesService = new PreferencesService(locals.supabase);
    const result = await preferencesService.update(currentUserId, defaultFrequency);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in PUT /api/preferences:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
