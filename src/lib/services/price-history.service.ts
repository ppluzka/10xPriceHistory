import type { SupabaseClient } from "../../db/supabase.client";
import type { ExtractedPrice, PriceStats } from "../../types";

/**
 * PriceHistoryService - Manages price history entries
 *
 * Responsibilities:
 * - Save prices to price_history table
 * - Validate price correctness (range, type)
 * - Update offers.last_checked
 * - Detect price anomalies (>50% change)
 * - Calculate statistics (min, max, avg)
 *
 * Reference: Implementation Plan Section 3.3
 */
export class PriceHistoryService {
  private supabase: SupabaseClient;
  private readonly ANOMALY_THRESHOLD = 0.5; // 50% change

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Detects if the new price is an anomaly (>50% change from last price)
   * @param offerId - The offer ID to check
   * @param newPrice - The new price to compare
   * @returns Promise resolving to true if anomaly detected, false otherwise
   */
  async detectPriceAnomaly(offerId: number, newPrice: number): Promise<boolean> {
    // Get last price from history
    const { data: lastEntry, error } = await this.supabase
      .from("price_history")
      .select("price")
      .eq("offer_id", offerId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !lastEntry) {
      return false; // No previous price to compare
    }

    const lastPrice = lastEntry.price;
    const percentChange = Math.abs((newPrice - lastPrice) / lastPrice);

    if (percentChange > this.ANOMALY_THRESHOLD) {
      // Log anomaly
      await this.supabase.from("system_logs").insert({
        offer_id: offerId,
        event_type: "price_anomaly_detected",
        message: `Price changed by ${(percentChange * 100).toFixed(2)}%`,
        metadata: {
          old_price: lastPrice,
          new_price: newPrice,
          percent_change: percentChange,
        },
      });

      return true;
    }

    return false;
  }

  /**
   * Saves a price entry to the price_history table
   * @param offerId - The offer ID
   * @param extractedPrice - The extracted price data
   * @throws Error if save fails
   */
  async savePriceEntry(offerId: number, extractedPrice: ExtractedPrice): Promise<void> {
    const { error } = await this.supabase.from("price_history").insert({
      offer_id: offerId,
      price: extractedPrice.price,
      currency: extractedPrice.currency as "PLN" | "EUR" | "USD" | "GBP",
      checked_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to save price entry: ${error.message}`);
    }
  }

  /**
   * Updates the last_checked timestamp for an offer
   * @param offerId - The offer ID to update
   * @throws Error if update fails
   */
  async updateLastChecked(offerId: number): Promise<void> {
    const { error } = await this.supabase
      .from("offers")
      .update({ last_checked: new Date().toISOString() })
      .eq("id", offerId);

    if (error) {
      throw new Error(`Failed to update last_checked: ${error.message}`);
    }
  }

  /**
   * Gets price statistics for an offer
   * @param offerId - The offer ID
   * @returns Promise resolving to PriceStats
   */
  async getPriceStats(offerId: number): Promise<PriceStats> {
    const { data, error } = await this.supabase.from("price_history").select("price").eq("offer_id", offerId);

    if (error || !data || data.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const prices = data.map((entry) => entry.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const count = prices.length;

    return { min, max, avg, count };
  }
}
