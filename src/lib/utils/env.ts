/**
 * Environment variable utilities for Cloudflare Pages compatibility
 *
 * On Cloudflare Pages, environment variables should be accessed via
 * Astro.locals.runtime.env for server-side code (API routes, SSR pages).
 * For local development, we fall back to import.meta.env.
 *
 * Reference: https://docs.astro.build/en/guides/integrations-guide/cloudflare/#environment-variables-and-secrets
 */

import type { AstroGlobal } from "astro";

/**
 * Context type for API routes and SSR pages
 */
type EnvContext = AstroGlobal | { locals?: { runtime?: { env?: Record<string, unknown> } } } | undefined;

/**
 * Gets an environment variable from Cloudflare runtime or fallback to import.meta.env
 *
 * @param context - Astro context (optional, for server-side code)
 * @param key - Environment variable key
 * @returns Environment variable value or undefined
 */
export function getEnv(context: EnvContext, key: string): string | undefined {
  // Try Cloudflare runtime first (for server-side code on Cloudflare Pages)
  if (context?.locals?.runtime?.env) {
    const value = context.locals.runtime.env[key];
    if (typeof value === "string") {
      return value;
    }
  }

  // Fallback to import.meta.env (works for local dev and client-side)
  return import.meta.env[key];
}

/**
 * Gets an environment variable and throws if not found
 *
 * @param context - Astro context (optional, for server-side code)
 * @param key - Environment variable key
 * @param errorMessage - Custom error message if variable is missing
 * @returns Environment variable value
 * @throws Error if environment variable is not set
 */
export function getEnvRequired(context: EnvContext, key: string, errorMessage?: string): string {
  const value = getEnv(context, key);
  if (!value) {
    throw new Error(errorMessage || `${key} environment variable is not set`);
  }
  return value;
}
