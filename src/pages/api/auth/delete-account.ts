import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { DeleteAccountSchema } from "@/lib/validators/auth.validators";
import { isFeatureEnabled } from "@/features/flags";

export const prerender = false;

/**
 * POST /api/auth/delete-account
 * Permanently deletes authenticated user account
 * Requires active session and confirmation text "USUŃ"
 *
 * Request body:
 * {
 *   confirmation: "USUŃ"
 * }
 *
 * Response:
 * - 200: Success - account deleted and user signed out
 * - 400: Bad request - invalid confirmation or validation error
 * - 401: Unauthorized - no active session
 * - 500: Server error - database or sign out error
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
    // Step 1: Create Supabase client with request context
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
      locals,
    });

    // Step 2: Validate authorization - check for active session
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

    // Step 3: Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Validate input with Zod schema
    const validated = DeleteAccountSchema.safeParse(body);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          message: 'Wpisz "USUŃ" aby potwierdzić',
          details: validated.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Call database function to delete account
    // The function uses auth.uid() to ensure user can only delete their own account
    const { error: deleteError } = await supabase.rpc("delete_user_account");

    if (deleteError) {
      console.error("Delete account error:", deleteError);
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

    // Step 6: Sign out user after successful account deletion
    // This invalidates the JWT and clears session cookies
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("Sign out error after account deletion:", signOutError);
      // Account is already deleted, but sign out failed
      // Return success anyway, but log the error
      return new Response(
        JSON.stringify({
          message: "Account deleted successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Return success response
    return new Response(
      JSON.stringify({
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Handle any unexpected errors
    console.error("Delete account endpoint error:", error);

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
