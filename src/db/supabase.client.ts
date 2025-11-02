import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Cookie options for Supabase Auth
 * Used for secure session management in SSR
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parses cookie header string into array of name/value pairs
 * Required for Supabase SSR cookie management
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase client instance configured for server-side rendering
 *
 * IMPORTANT: Use this function in API routes and Astro pages that need auth
 * Do NOT import supabaseClient directly when you need session context
 *
 * @param context - Object containing headers and cookies from Astro context
 * @returns Configured Supabase client with session awareness
 *
 * @example
 * // In API route
 * const supabase = createSupabaseServerInstance({
 *   headers: request.headers,
 *   cookies: cookies
 * });
 * const { data: { user } } = await supabase.auth.getUser();
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

/**
 * Legacy client for backwards compatibility
 * @deprecated Use createSupabaseServerInstance() in API routes and middleware
 * Only use this for client-side operations where session context is not needed
 */
import { createClient } from "@supabase/supabase-js";
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Default user ID for development (before auth is implemented)
 * @deprecated Will be removed once auth is fully integrated
 * Use Astro.locals.user.id instead
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Export type for use in other files
export type SupabaseClient = ReturnType<typeof createSupabaseServerInstance>;
