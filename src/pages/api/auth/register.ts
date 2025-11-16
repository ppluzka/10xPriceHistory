import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { RegisterSchema } from "@/lib/validators/auth.validators";
import { isFeatureEnabled } from "@/features/flags";

/**
 * POST /api/auth/register
 *
 * Registers a new user with email and password
 *
 * Request body:
 * {
 *   email: string;
 *   password: string;
 *   captchaToken?: string; // Optional in MVP, will be required later
 * }
 *
 * Response:
 * - 201: Success - user created, verification email sent
 * - 400: Bad request - validation error
 * - 409: Conflict - email already exists
 * - 429: Too many requests - rate limit exceeded
 * - 500: Server error
 *
 * Success response body:
 * {
 *   message: "Registration successful. Check your email to verify your account.",
 *   email: string;
 * }
 *
 * Error response body:
 * {
 *   error: string;
 *   code?: string;
 *   details?: any;
 * }
 */
export const POST: APIRoute = async ({ request, cookies, url, locals }) => {
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

    // For MVP, we make captchaToken optional
    // In production, this should be required
    const validationData = {
      email: body.email,
      password: body.password,
      captchaToken: body.captchaToken || "SKIP_FOR_MVP", // Temporary skip
    };

    const validated = RegisterSchema.safeParse(validationData);

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
      locals,
    });

    // Get site URL for email redirects
    const siteUrl = url.origin;

    // Attempt to sign up with Supabase Auth
    const { error } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
      options: {
        // Redirect user to callback page after email verification
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    // Handle registration errors
    if (error) {
      // Email already exists
      if (error.message.includes("User already registered") || error.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({
            error: "Email jest już zarejestrowany",
            code: "EMAIL_ALREADY_EXISTS",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Weak password (if Supabase rejects it)
      if (error.message.includes("Password")) {
        return new Response(
          JSON.stringify({
            error: "Hasło nie spełnia wymagań bezpieczeństwa",
            code: "WEAK_PASSWORD",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Other errors
      console.error("Registration error:", error);
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas rejestracji",
          code: "REGISTRATION_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success - user created and verification email sent automatically by Supabase
    return new Response(
      JSON.stringify({
        message: "Registration successful. Check your email to verify your account.",
        email: validated.data.email,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in register endpoint:", error);
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
