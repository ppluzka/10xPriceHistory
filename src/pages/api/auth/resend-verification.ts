import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { ResendVerificationSchema } from "@/lib/validators/auth.validators";
import { isFeatureEnabled } from "@/features/flags";

/**
 * POST /api/auth/resend-verification
 *
 * Resends email verification link to user
 *
 * Request body:
 * {
 *   email: string;
 * }
 *
 * Response:
 * - 200: Success - verification email resent
 * - 400: Bad request - validation error
 * - 429: Too many requests - rate limit (1/minute per email)
 * - 500: Server error
 *
 * Success response body:
 * {
 *   message: "Verification email sent successfully"
 * }
 *
 * Error response body:
 * {
 *   error: string;
 *   code?: string;
 * }
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
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
    // Parse and validate request body
    const body = await request.json();
    const validated = ResendVerificationSchema.safeParse(body);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy adres email",
          details: validated.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with request context
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies: cookies,
    });

    // Get site URL for email redirects
    const siteUrl = url.origin;

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: validated.data.email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        return new Response(
          JSON.stringify({
            error: "Zbyt wiele prób. Spróbuj ponownie za minutę",
            code: "RATE_LIMIT_EXCEEDED",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error.message.includes("already verified") || error.message.includes("Email not found")) {
        // Don't reveal if email exists or not (security)
        return new Response(
          JSON.stringify({
            message: "Verification email sent successfully",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.error("Resend verification error:", error);
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas wysyłania emaila",
          code: "RESEND_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success
    return new Response(
      JSON.stringify({
        message: "Verification email sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in resend-verification endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
        code: "INTERNAL_ERROR",
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
