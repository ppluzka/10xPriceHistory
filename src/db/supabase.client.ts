import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types.ts";
import { getEnvRequired } from "../lib/utils/env.ts";

/**
 * Gets Supabase URL from environment, supporting Cloudflare Pages runtime
 */
function getSupabaseUrl(context?: { locals?: { runtime?: { env?: Record<string, unknown> } } }): string {
  return getEnvRequired(context, "SUPABASE_URL", "SUPABASE_URL environment variable is required");
}

/**
 * Gets Supabase anon key from environment, supporting Cloudflare Pages runtime
 */
function getSupabaseAnonKey(context?: { locals?: { runtime?: { env?: Record<string, unknown> } } }): string {
  return getEnvRequired(context, "SUPABASE_KEY", "SUPABASE_KEY environment variable is required");
}

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
 * Fallback method for reading cookies from raw Cookie header
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const trimmed = cookie.trim();
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) return { name: trimmed, value: "" };
    return {
      name: trimmed.substring(0, equalIndex),
      value: trimmed.substring(equalIndex + 1),
    };
  });
}

/**
 * Creates a Supabase client instance configured for server-side rendering
 *
 * IMPORTANT: Use this function in API routes and Astro pages that need auth
 * Do NOT import supabaseClient directly when you need session context
 *
 * @param context - Object containing headers, cookies, and optionally locals from Astro context
 * @returns Configured Supabase client with session awareness
 *
 * @example
 * // In API route
 * const supabase = createSupabaseServerInstance({
 *   headers: request.headers,
 *   cookies: cookies,
 *   locals: Astro.locals // Optional, for Cloudflare Pages runtime env access
 * });
 * const { data: { user } } = await supabase.auth.getUser();
 */
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  locals?: { runtime?: { env?: Record<string, unknown> } };
}) => {
  const supabaseUrl = getSupabaseUrl(context);
  const supabaseAnonKey = getSupabaseAnonKey(context);
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        // Parse cookies from the Cookie header sent by the browser
        // This is the source of truth for cookies in the request
        const cookieHeader = context.headers.get("Cookie");
        return parseCookieHeader(cookieHeader ?? "");
      },
      setAll(cookiesToSet) {
        // Wrap in try-catch to handle cases where response is already sent (e.g., after redirect)
        // This can happen when getUser() or exchangeCodeForSession() sets cookies after a redirect
        try {
          cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
        } catch (error) {
          // If response is already sent, silently ignore cookie setting errors
          // The cookies were likely already included in the redirect response
          if (
            error instanceof Error &&
            (error.name === "ResponseSentError" ||
              error.message.includes("response has already been sent") ||
              error.message.includes("cannot be altered"))
          ) {
            // Silently ignore - cookies were already set before redirect
            return;
          }
          // Re-throw other errors
          throw error;
        }
      },
    },
  });

  return supabase;
};

/**
 * Legacy client for backwards compatibility
 * @deprecated Use createSupabaseServerInstance() in API routes and middleware
 * Only use this for client-side operations where session context is not needed
 *
 * Note: This uses import.meta.env which may not work on Cloudflare Pages.
 * For server-side code, use createSupabaseServerInstance() instead.
 */
import { createClient } from "@supabase/supabase-js";
// Fallback to import.meta.env for client-side usage (deprecated)
const fallbackSupabaseUrl = import.meta.env.SUPABASE_URL;
const fallbackSupabaseAnonKey = import.meta.env.SUPABASE_KEY;
export const supabaseClient = createClient<Database>(fallbackSupabaseUrl || "", fallbackSupabaseAnonKey || "");

/**
 * Creates a Supabase client with service role key (bypasses RLS)
 * Use ONLY for server-side operations that need to bypass RLS (e.g., CRON jobs)
 *
 * @param context - Optional Astro context for accessing Cloudflare runtime env
 * @returns Supabase client with service role privileges
 */
export const createSupabaseServiceRoleClient = (context?: {
  locals?: { runtime?: { env?: Record<string, unknown> } };
}): ReturnType<typeof createClient<Database>> => {
  // Try Cloudflare runtime first, then fallback to import.meta.env
  let serviceRoleKey: string | undefined;
  if (context?.locals?.runtime?.env) {
    serviceRoleKey = context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  }
  if (!serviceRoleKey) {
    serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured. Required for service operations.");
  }

  const supabaseUrl = getSupabaseUrl(context);
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Default user ID for development (before auth is implemented)
 * @deprecated Will be removed once auth is fully integrated
 * Use Astro.locals.user.id instead
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Export type for use in other files
export type SupabaseClient = ReturnType<typeof createSupabaseServerInstance>;
