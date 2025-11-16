import type { APIRoute } from "astro";
import { isFeatureEnabled } from "@/features/flags";

/**
 * GET /api/auth/check
 *
 * Helper endpoint do sprawdzenia stanu sesji
 * Użyj w konsoli przeglądarki lub do debugowania
 */
export const GET: APIRoute = async ({ locals }) => {
  // Check if auth feature is enabled
  if (!isFeatureEnabled("auth")) {
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

  return new Response(
    JSON.stringify({
      authenticated: !!locals.user,
      user: locals.user,
      current_user_id: locals.current_user_id,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const prerender = false;
