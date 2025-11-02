import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type { DashboardDto, DashboardSummaryDto, OfferDto } from "../../types";
import { OfferService } from "./offer.service";
import { OpenRouterService } from "../openrouter.service";

/**
 * Service for dashboard data aggregation
 */
export class DashboardService {
  private offerService: OfferService;

  constructor(
    private supabase: SupabaseClient<Database>,
    openRouterService?: OpenRouterService
  ) {
    this.offerService = new OfferService(supabase, openRouterService);
  }

  /**
   * Get dashboard data with summary statistics and offers list
   * @param userId - Current authenticated user ID
   * @returns Dashboard data with summary and offers
   */
  async get(userId: string): Promise<DashboardDto> {
    // Get all active offers for the user (no pagination, reasonable limit)
    // Using size=100 to get all offers for most users
    const result = await this.offerService.list(userId, 1, 100, "created_at");

    // Calculate summary statistics
    const summary = this.calculateSummary(result.data);

    return {
      summary,
      offers: result.data,
    };
  }

  /**
   * Calculate summary statistics from offers list
   * @param offers - List of active offers
   * @returns Summary statistics
   */
  private calculateSummary(offers: OfferDto[]): DashboardSummaryDto {
    // If no offers, return zeros
    if (offers.length === 0) {
      return {
        activeCount: 0,
        avgChange: 0,
        largestDrop: 0,
        largestRise: 0,
      };
    }

    // Count active offers
    const activeCount = offers.filter((o) => o.status === "active").length;

    // Calculate average percentage change (from first price)
    const changesFromFirst = offers.map((o) => o.percentChangeFromFirst).filter((change) => !isNaN(change));

    const avgChange =
      changesFromFirst.length > 0
        ? changesFromFirst.reduce((sum, change) => sum + change, 0) / changesFromFirst.length
        : 0;

    // Find largest drop (most negative change)
    const largestDrop = changesFromFirst.length > 0 ? Math.min(...changesFromFirst) : 0;

    // Find largest rise (most positive change)
    const largestRise = changesFromFirst.length > 0 ? Math.max(...changesFromFirst) : 0;

    return {
      activeCount,
      avgChange: Number(avgChange.toFixed(2)),
      largestDrop: Number(largestDrop.toFixed(2)),
      largestRise: Number(largestRise.toFixed(2)),
    };
  }
}
