import type { SupabaseClient } from "../../db/supabase.client";
import type { RetryDecision } from "../../types";
import { OfferStatus } from "../../types";

/**
 * ErrorHandlerService - Manages error handling and retry logic
 *
 * Responsibilities:
 * - Implement retry mechanism with growing intervals
 * - Manage offer statuses (active → error/removed)
 * - Log errors to error_log table
 * - Track attempt counts for each offer
 * - Make decisions about further processing
 *
 * Reference: Implementation Plan Section 3.4
 */
export class ErrorHandlerService {
  private supabase: SupabaseClient;

  private readonly RETRY_DELAYS: Record<number, number> = {
    1: 60000, // 1 minute
    2: 300000, // 5 minutes
    3: 900000, // 15 minutes
  };

  private readonly MAX_ATTEMPTS = 3;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Checks if should retry based on attempt number
   * @param attempt - Current attempt number
   * @returns True if should retry, false otherwise
   */
  shouldRetry(attempt: number): boolean {
    return attempt < this.MAX_ATTEMPTS;
  }

  /**
   * Gets retry delay for given attempt
   * @param attempt - Attempt number (1-3)
   * @returns Delay in milliseconds
   */
  getRetryDelay(attempt: number): number {
    return this.RETRY_DELAYS[attempt] || 0;
  }

  /**
   * Handles scraping error and determines retry decision
   * @param offerId - The offer ID that failed
   * @param error - The error that occurred
   * @param attempt - Current attempt number
   * @returns Promise resolving to RetryDecision
   */
  async handleScrapingError(offerId: number, error: Error, attempt: number): Promise<RetryDecision> {
    // Log the error
    await this.logError(offerId, error, attempt);

    // Check if we should retry
    if (this.shouldRetry(attempt)) {
      const nextAttempt = attempt + 1;
      const delayMs = this.getRetryDelay(nextAttempt);

      return {
        shouldRetry: true,
        delayMs,
        nextAttempt,
      };
    }

    // Max attempts reached - mark as error
    await this.updateOfferStatus(offerId, OfferStatus.ERROR);

    return {
      shouldRetry: false,
      delayMs: 0,
      nextAttempt: 0,
    };
  }

  /**
   * Updates offer status in database
   * @param offerId - The offer ID to update
   * @param status - New status (active, error, removed)
   * @throws Error if update fails
   */
  async updateOfferStatus(offerId: number, status: OfferStatus): Promise<void> {
    const { error } = await this.supabase.from("offers").update({ status: status }).eq("id", offerId);

    if (error) {
      console.error(`Failed to update offer status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logs error to error_log table
   * @param offerId - The offer ID
   * @param error - The error that occurred
   * @param attempt - Current attempt number
   */
  async logError(offerId: number, error: Error, attempt: number): Promise<void> {
    const { error: insertError } = await this.supabase.from("error_log").insert({
      offer_id: offerId,
      error_message: error.message,
      error_stack: error.stack || null,
      attempt_number: attempt,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(`Failed to log error: ${insertError.message}`);
    }
  }
}
