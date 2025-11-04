import type { APIRoute } from "astro";
import { OfferProcessorService } from "../../../lib/services/offer-processor.service";
import { MonitoringService } from "../../../lib/services/monitoring.service";
import { createSupabaseServiceRoleClient } from "../../../db/supabase.client";

/**
 * CRON Endpoint: /api/cron/check-prices
 *
 * Purpose: Scheduled job to check prices for all active offers
 * Triggered by: pg_cron scheduled jobs
 *
 * Process:
 * 1. Verify CRON_SECRET authorization
 * 2. Fetch all active offers from database
 * 3. Process offers in batches (10 per batch)
 * 4. Check system health and send alerts if needed
 *
 * Reference: Implementation Plan Section 5.2 and Phase 6.1
 */

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Step 1: Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized CRON request attempt");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Step 2: Use service role client for CRON operations (bypasses RLS)
    const supabaseService = createSupabaseServiceRoleClient();
    
    // Get active offers (only those being tracked by at least one user)
    const { data: offers, error } = await supabaseService.from("offers").select("*").eq("status", "active");

    if (error) {
      console.error("Failed to fetch offers:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch offers", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!offers || offers.length === 0) {
      console.info("No active offers to process");
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No active offers to process",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.info(`Processing ${offers.length} active offers`);

    // Step 3: Process offers in batches with timeout protection
    // Use service role client to bypass RLS for price_history inserts
    const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY;
    const offerProcessor = new OfferProcessorService(supabaseService, openRouterApiKey);

    const batchSize = 10;
    const MAX_PROCESSING_TIME_MS = 5 * 60 * 1000; // 5 minutes max for entire job

    let processedCount = 0;
    let errorCount = 0;

    try {
      // Process with timeout protection
      const processingPromise = offerProcessor.processBatch(offers, batchSize);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Processing timeout after 5 minutes")), MAX_PROCESSING_TIME_MS)
      );

      await Promise.race([processingPromise, timeoutPromise]);
      processedCount = offers.length;
    } catch (processingError) {
      if (processingError instanceof Error && processingError.message.includes("timeout")) {
        console.error("Processing timed out after 5 minutes");
        errorCount = offers.length;
      } else {
        console.error("Error during batch processing:", processingError);
        errorCount = offers.length;
      }
    } finally {
      // Cleanup
      await offerProcessor.close();
    }

    // Step 4: Check system health and send alerts if needed
    const monitoringService = new MonitoringService(supabaseService);
    await monitoringService.checkAndSendAlert();

    console.info(`Processing completed: ${processedCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        message: errorCount > 0 ? "Price check completed with some errors" : "Price check completed successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("CRON job failed:", error);

    return new Response(
      JSON.stringify({
        error: "CRON job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
