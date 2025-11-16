import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { ChangePasswordSchema } from "@/lib/validators/auth.validators";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

/**
 * POST /api/auth/change-password
 * Changes password for authenticated user
 * Requires active session and current password verification
 *
 * Request body:
 * {
 *   currentPassword: string;
 *   newPassword: string;
 * }
 *
 * Response:
 * - 200: Success - password changed
 * - 400: Bad request - validation error or update failed
 * - 401: Unauthorized - invalid current password or no session
 * - 500: Server error
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
      cookies,
    });

    // 1. Sprawdzenie sesji (middleware)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Brak autoryzacji",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Walidacja
    const body = await request.json().catch(() => ({}));
    const validated = ChangePasswordSchema.safeParse(body);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          message: "Nieprawidłowe dane wejściowe",
          details: validated.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Weryfikacja aktualnego hasła (re-authentication)
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: session.user.email ?? "",
      password: validated.data.currentPassword,
    });

    if (reAuthError) {
      return new Response(
        JSON.stringify({
          error: "Current password is incorrect",
          message: "Nieprawidłowe aktualne hasło",
          code: "INVALID_CURRENT_PASSWORD",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Zmiana hasła
    const { error: updateError } = await supabase.auth.updateUser({
      password: validated.data.newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);

      // Handle specific Supabase errors
      if (updateError.message.includes("weak")) {
        return new Response(
          JSON.stringify({
            error: "Hasło jest zbyt słabe. Użyj silniejszego hasła",
            message: "Hasło jest zbyt słabe. Użyj silniejszego hasła",
            code: "WEAK_PASSWORD",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: updateError.message,
          message: "Nie udało się zmienić hasła",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Supabase automatycznie wysyła email o zmianie hasła
    return new Response(
      JSON.stringify({
        message: "Password changed successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Change password endpoint error:", error);

    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera, spróbuj ponownie później",
        message: "Wystąpił błąd serwera, spróbuj ponownie później",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
