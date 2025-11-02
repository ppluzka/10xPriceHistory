import type { APIRoute } from "astro";

import { DashboardService } from "../../lib/services/dashboard.service";
import { OpenRouterService } from "../../lib/openrouter.service";

export const prerender = false;

// Singleton instance for OpenRouter service
let openRouterService: OpenRouterService | null = null;

/**
 * Gets or creates OpenRouter service instance
 */
function getOpenRouterService(): OpenRouterService {
  if (!openRouterService) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    openRouterService = new OpenRouterService({
      apiKey,
      baseUrl: import.meta.env.OPENROUTER_BASE_URL,
      defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
      timeoutMs: import.meta.env.OPENROUTER_TIMEOUT_MS
        ? parseInt(import.meta.env.OPENROUTER_TIMEOUT_MS, 10)
        : undefined,
      maxRetries: import.meta.env.OPENROUTER_MAX_RETRIES
        ? parseInt(import.meta.env.OPENROUTER_MAX_RETRIES, 10)
        : undefined,
    });
  }

  return openRouterService;
}

/**
 * GET /api/dashboard
 * Returns dashboard summary statistics and list of active offers
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get user ID from middleware (using DEFAULT_USER_ID for now)
    const currentUserId = locals.current_user_id as string;

    // Call service layer to get dashboard data
    const dashboardService = new DashboardService(locals.supabase, getOpenRouterService());
    const result = await dashboardService.get(currentUserId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
