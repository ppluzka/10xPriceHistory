import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { isFeatureEnabled } from "@/features/flags";

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by invalidating their session
 *
 * Response:
 * - 200: Success - user logged out, session cleared
 * - 500: Server error
 *
 * Success response body:
 * {
 *   message: "Logged out successfully"
 * }
 *
 * Error response body:
 * {
 *   error: string;
 * }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
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

  try {
    // Create Supabase client with request context
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies: cookies,
    });

    // Sign out from Supabase Auth
    // This will invalidate the session and clear cookies automatically
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas wylogowania",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success - cookies are automatically cleared by Supabase SDK
    return new Response(
      JSON.stringify({
        message: "Logged out successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in logout endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route (SSR required)
export const prerender = false;
