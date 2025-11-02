import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

// Validation schema
const ForgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").max(255, "Email zbyt długi"),
});

/**
 * POST /api/auth/forgot-password
 * Sends password reset email to user
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = ForgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy adres email",
          details: validation.error.errors,
        }),
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    // Get the origin for redirect URL
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/reset-password`;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Handle errors
    if (error) {
      console.error("Password reset error:", error);
      
      // Don't reveal if email exists or not for security
      // Always return success to prevent email enumeration
      return new Response(
        JSON.stringify({
          message: "Jeśli konto istnieje, otrzymasz link do zresetowania hasła",
        }),
        { status: 200 }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        message: "Link do zresetowania hasła został wysłany na podany adres email",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password endpoint error:", error);
    
    // Generic error response
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd serwera, spróbuj ponownie później",
      }),
      { status: 500 }
    );
  }
};

