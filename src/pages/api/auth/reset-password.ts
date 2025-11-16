import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

// Validation schema
const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków").max(72, "Hasło może mieć maksymalnie 72 znaki"),
});

/**
 * POST /api/auth/reset-password
 * Updates user password after they click reset link from email
 * Requires valid session from reset token
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
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
    const body = await request.json().catch(() => ({}));
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe hasło",
          details: validation.error.errors,
        }),
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
      locals,
    });

    // Check if user has valid session (from reset token)
    // Use getUser() instead of getSession() for security - verifies with Auth server
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Link wygasł lub jest nieprawidłowy",
          code: "INVALID_TOKEN",
        }),
        { status: 401 }
      );
    }

    // Update user password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Password update error:", error);

      // Handle specific Supabase errors
      if (error.message.includes("weak")) {
        return new Response(
          JSON.stringify({
            error: "Hasło jest zbyt słabe. Użyj silniejszego hasła",
            code: "WEAK_PASSWORD",
          }),
          { status: 422 }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Nie udało się zresetować hasła",
          code: "UPDATE_FAILED",
        }),
        { status: 400 }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        message: "Hasło zostało pomyślnie zmienione",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password endpoint error:", error);

    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera, spróbuj ponownie później",
      }),
      { status: 500 }
    );
  }
};
