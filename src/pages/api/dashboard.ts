import type { APIRoute } from "astro";

import { DashboardService } from "../../lib/services/dashboard.service";
import { createOpenRouterService } from "../../lib/utils/openrouter";

export const prerender = false;

/**
 * GET /api/dashboard
 * Returns dashboard summary statistics and list of active offers
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get user ID from middleware - validate authentication
    const currentUserId = locals.current_user_id;

    if (!currentUserId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call service layer to get dashboard data
    const dashboardService = new DashboardService(locals.supabase, createOpenRouterService({ locals }));
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
