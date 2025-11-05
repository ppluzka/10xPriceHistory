import type { SupabaseClient } from "../../db/supabase.client";
import type { Tables } from "../../db/database.types";
import { ScrapingService } from "./scraping.service";
import { AIExtractionService } from "./ai-extraction.service";
import { ValidationService } from "./validation.service";
import { PriceHistoryService } from "./price-history.service";
import { ErrorHandlerService } from "./error-handler.service";
import { MonitoringService } from "./monitoring.service";
import { OfferStatus } from "../../types";

/**
 * OfferProcessorService - Main orchestrator for processing offers
 *
 * Responsibilities:
 * - Orchestrate all services for complete price checking workflow
 * - Handle retry logic with exponential backoff
 * - Manage offer status transitions
 * - Process offers with selector-first, AI-fallback strategy
 *
 * Reference: Implementation Plan Section 3.4 and 7.2
 */

type Offer = Tables<"offers">;

export class OfferProcessorService {
  private scrapingService: ScrapingService;
  private aiExtractionService: AIExtractionService | null = null;
  private validationService: ValidationService;
  private priceHistoryService: PriceHistoryService;
  private errorHandlerService: ErrorHandlerService;
  private monitoringService: MonitoringService;
  private supabase: SupabaseClient;
  private openRouterApiKey: string | null;

  constructor(supabase: SupabaseClient, openRouterApiKey?: string) {
    this.supabase = supabase;
    this.openRouterApiKey = openRouterApiKey || null;

    // Initialize services
    this.scrapingService = new ScrapingService();
    this.validationService = new ValidationService();
    this.priceHistoryService = new PriceHistoryService(supabase);
    this.errorHandlerService = new ErrorHandlerService(supabase);
    this.monitoringService = new MonitoringService(supabase);

    // AI service is initialized lazily only when needed
  }

  /**
   * Gets or creates AI extraction service (lazy initialization)
   * @private
   */
  private getAIExtractionService(): AIExtractionService {
    if (!this.aiExtractionService) {
      if (!this.openRouterApiKey) {
        throw new Error("OpenRouter API key not configured for AI extraction");
      }
      this.aiExtractionService = new AIExtractionService(this.openRouterApiKey);
    }
    return this.aiExtractionService;
  }

  /**
   * Gets the current attempt number for an offer based on error_log
   * @param offerId - The offer ID
   * @returns Current attempt number (1-3)
   * @private
   */
  private async getCurrentAttempt(offerId: number): Promise<number> {
    // Count errors in last 24 hours to determine attempt number
    const { count, error } = await this.supabase
      .from("error_log")
      .select("*", { count: "exact", head: true })
      .eq("offer_id", offerId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error || !count) {
      return 1; // First attempt
    }

    // Return next attempt number (max 3)
    return Math.min(count + 1, 3);
  }

  /**
   * Processes a single offer with full workflow
   * @param offer - The offer to process
   * @returns Promise that resolves when processing is complete
   */
  async processOffer(offer: Offer): Promise<void> {
    // Get current attempt number based on previous errors
    const attempt = await this.getCurrentAttempt(offer.id);
    try {
      // Step 1: Fetch HTML
      const html = await this.scrapingService.fetchOfferPage(offer.url);

      // Step 2: Try selector-based extraction
      let extractedPrice = await this.scrapingService.extractPriceWithSelector(html, offer.selector || "");

      // Step 3: Fallback to AI if selector failed
      if (!extractedPrice && this.openRouterApiKey) {
        try {
          const aiExtraction = await this.getAIExtractionService().extractPriceOnly(html, offer.url);

          if (!this.getAIExtractionService().validateConfidence(aiExtraction)) {
            throw new Error("Low confidence AI extraction");
          }

          extractedPrice = {
            price: aiExtraction.price,
            currency: aiExtraction.currency,
            rawValue: `${aiExtraction.price} ${aiExtraction.currency}`,
          };

          // Update selector for future use
          await this.updateOfferSelector(offer.id, aiExtraction.selector);
        } catch (aiError) {
          console.error(`AI extraction failed for offer ${offer.id}:`, aiError);
          // Continue to validation error if AI also fails
        }
      }

      // If still no price extracted, throw error
      if (!extractedPrice) {
        throw new Error("Failed to extract price with both selector and AI");
      }

      // Step 4: Validate extracted price
      const validation = this.validationService.validateExtractedData(extractedPrice);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Step 5: Check for anomalies
      const isAnomaly = await this.priceHistoryService.detectPriceAnomaly(offer.id, extractedPrice.price);
      if (isAnomaly) {
        console.warn(`Price anomaly detected for offer ${offer.id}`);
        // Log but continue processing
      }

      // Step 6: Save to price history
      await this.priceHistoryService.savePriceEntry(offer.id, extractedPrice);
      await this.priceHistoryService.updateLastChecked(offer.id);

      // Step 7: Track success
      await this.monitoringService.trackCheckResult(offer.id, true);

      // Ensure status is active if previously in error (successful check means offer is working again)
      if (offer.status === OfferStatus.ERROR) {
        await this.errorHandlerService.updateOfferStatus(offer.id, OfferStatus.ACTIVE);
      }
    } catch (error) {
      await this.handleProcessingError(offer, error as Error, attempt);
    }
  }

  /**
   * Handles processing errors with retry logic
   *
   * IMPORTANT: Retry logic works across multiple CRON runs, not within a single request.
   * This prevents the endpoint from hanging for minutes waiting for retries.
   * Each CRON run attempts once, and retries happen in subsequent scheduled runs.
   *
   * @param offer - The offer that failed processing
   * @param error - The error that occurred
   * @param attempt - Current attempt number
   * @private
   */
  private async handleProcessingError(offer: Offer, error: Error, attempt: number): Promise<void> {
    // Check if offer was removed (404/410)
    if (error.message.includes("HTTP 404") || error.message.includes("HTTP 410")) {
      await this.errorHandlerService.updateOfferStatus(offer.id, OfferStatus.REMOVED);
      await this.monitoringService.trackCheckResult(offer.id, false);
      return;
    }

    // Handle other errors - log error and let next CRON run handle retry
    // We don't retry immediately to avoid blocking the endpoint for minutes
    const retryDecision = await this.errorHandlerService.handleScrapingError(offer.id, error, attempt);

    if (retryDecision.shouldRetry) {
      // Log that we'll retry in next CRON run
      // Don't wait for retry - let next CRON run handle it
      // Status remains 'active' so it will be picked up in next run
      await this.monitoringService.trackCheckResult(offer.id, false);
    } else {
      // Max attempts reached - mark as error
      await this.monitoringService.trackCheckResult(offer.id, false);
    }
  }

  /**
   * Updates offer selector in database
   * @param offerId - The offer ID
   * @param newSelector - New CSS selector
   * @private
   */
  private async updateOfferSelector(offerId: number, newSelector: string): Promise<void> {
    const { error } = await this.supabase.from("offers").update({ selector: newSelector }).eq("id", offerId);

    if (error) {
      console.error(`Failed to update selector for offer ${offerId}:`, error);
    }
  }

  /**
   * Creates a delay promise
   * @param ms - Milliseconds to delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Processes multiple offers in batches
   * @param offers - Array of offers to process
   * @param batchSize - Number of offers per batch
   * @returns Promise that resolves when all batches are processed
   */
  async processBatch(offers: Offer[], batchSize = 10): Promise<void> {
    for (let i = 0; i < offers.length; i += batchSize) {
      const batch = offers.slice(i, i + batchSize);

      // Process batch in parallel
      const results = await Promise.allSettled(batch.map((offer) => this.processOffer(offer)));

      // Log batch results with error details
      const failedResults = results.filter((r) => r.status === "rejected");

      if (failedResults.length > 0) {
        console.error(
          `Batch ${Math.floor(i / batchSize) + 1}: ${failedResults.length} failed`,
          failedResults.map((r) => (r.status === "rejected" ? r.reason : "unknown"))
        );
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < offers.length) {
        await this.delay(5000); // 5s between batches
      }
    }
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    if (this.aiExtractionService) {
      await this.aiExtractionService.close();
    }
  }
}
