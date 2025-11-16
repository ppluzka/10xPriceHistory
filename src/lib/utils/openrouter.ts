/**
 * Utility functions for creating OpenRouter service instances
 * Compatible with Cloudflare Pages environment variable access
 */

import { OpenRouterService } from "../openrouter.service";
import { getEnv, getEnvRequired } from "./env";

/**
 * Context type for API routes
 */
type EnvContext = { locals?: { runtime?: { env?: Record<string, unknown> } } } | undefined;

/**
 * Creates an OpenRouter service instance using environment variables
 * Compatible with both local development and Cloudflare Pages
 *
 * @param context - Optional Astro context for accessing Cloudflare runtime env
 * @returns OpenRouterService instance
 * @throws Error if OPENROUTER_API_KEY is not set
 */
export function createOpenRouterService(context?: EnvContext): OpenRouterService {
  const apiKey = getEnvRequired(context, "OPENROUTER_API_KEY");
  const timeoutMsStr = getEnv(context, "OPENROUTER_TIMEOUT_MS");
  const maxRetriesStr = getEnv(context, "OPENROUTER_MAX_RETRIES");

  return new OpenRouterService({
    apiKey,
    baseUrl: getEnv(context, "OPENROUTER_BASE_URL"),
    defaultModel: getEnv(context, "OPENROUTER_DEFAULT_MODEL"),
    timeoutMs: timeoutMsStr ? parseInt(timeoutMsStr, 10) : undefined,
    maxRetries: maxRetriesStr ? parseInt(maxRetriesStr, 10) : undefined,
  });
}

/**
 * Creates an OpenRouter service instance, returning null if API key is not set
 * Useful for test environments where OpenRouter may not be configured
 *
 * @param context - Optional Astro context for accessing Cloudflare runtime env
 * @returns OpenRouterService instance or null if API key is not set
 */
export function createOpenRouterServiceOrNull(context?: EnvContext): OpenRouterService | null {
  const apiKey = getEnv(context, "OPENROUTER_API_KEY");

  if (!apiKey) {
    return null;
  }

  const timeoutMsStr = getEnv(context, "OPENROUTER_TIMEOUT_MS");
  const maxRetriesStr = getEnv(context, "OPENROUTER_MAX_RETRIES");

  return new OpenRouterService({
    apiKey,
    baseUrl: getEnv(context, "OPENROUTER_BASE_URL"),
    defaultModel: getEnv(context, "OPENROUTER_DEFAULT_MODEL"),
    timeoutMs: timeoutMsStr ? parseInt(timeoutMsStr, 10) : undefined,
    maxRetries: maxRetriesStr ? parseInt(maxRetriesStr, 10) : undefined,
  });
}
