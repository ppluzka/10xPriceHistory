import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

/**
 * Public paths that don't require authentication
 * These routes are accessible without being logged in
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/resend-verification",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/cron/check-prices", // CRON endpoint uses Bearer token (CRON_SECRET) instead of session
];

/**
 * Middleware for handling authentication and session management
 *
 * Flow:
 * 1. Create Supabase client with request context (cookies + headers)
 * 2. Get user session from Supabase Auth
 * 3. Set user data in Astro.locals for use in pages/components
 * 4. Protect routes: redirect to /login if not authenticated
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase client with proper cookie handling for this request
  const supabase = createSupabaseServerInstance({
    headers: context.request.headers,
    cookies: context.cookies,
  });

  // Make supabase client available in Astro.locals
  context.locals.supabase = supabase;

  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(context.url.pathname)) {
    context.locals.user = null;
    context.locals.current_user_id = null;
    return next();
  }

  // Get user session from Supabase Auth
  // This automatically handles JWT validation and token refresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated - set user data in locals
    context.locals.user = {
      id: user.id,
      email: user.email ?? "",
      emailVerified: user.email_confirmed_at !== null,
    };
    context.locals.current_user_id = user.id;
  } else {
    // User is not authenticated
    context.locals.user = null;
    context.locals.current_user_id = null;

    // Protected routes: redirect to login with returnUrl
    const protectedRoutes = ["/dashboard", "/settings", "/offer"];
    const isProtectedRoute = protectedRoutes.some((route) => context.url.pathname.startsWith(route));

    if (isProtectedRoute) {
      const returnUrl = encodeURIComponent(context.url.pathname + context.url.search);
      return context.redirect(`/login?returnUrl=${returnUrl}`);
    }
  }

  return next();
});
