import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { LoginSchema } from "@/lib/validators/auth.validators";
import { isFeatureEnabled } from "@/features/flags";

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password
 *
 * Request body:
 * {
 *   email: string;
 *   password: string;
 * }
 *
 * Response:
 * - 200: Success - user authenticated, session created
 * - 400: Bad request - validation error
 * - 401: Unauthorized - invalid credentials
 * - 403: Forbidden - email not verified
 * - 500: Server error
 *
 * Success response body:
 * {
 *   message: "Login successful",
 *   user: {
 *     id: string;
 *     email: string;
 *   }
 * }
 *
 * Error response body:
 * {
 *   error: string;
 *   code?: string;
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
    // Parse and validate request body
    const body = await request.json();
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
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

    // Attempt to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    // Handle authentication errors
    if (error) {
      // Email not verified
      if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
        return new Response(
          JSON.stringify({
            error: "Potwierdź email przed logowaniem",
            code: "EMAIL_NOT_VERIFIED",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Invalid credentials
      if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_credentials")) {
        return new Response(
          JSON.stringify({
            error: "Nieprawidłowy email lub hasło",
            code: "INVALID_CREDENTIALS",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Other authentication errors
      console.error("Login error:", error);
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas logowania",
          code: "AUTH_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success - session is automatically set via cookies by Supabase SDK
    return new Response(
      JSON.stringify({
        message: "Login successful",
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in login endpoint:", error);
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
