/* eslint-disable no-console */
/**
 * Global E2E Teardown Script
 *
 * This script runs after ALL E2E tests have completed.
 * It cleans up the Supabase test database by removing test data.
 *
 * Environment variables required (from .env.test):
 * - SUPABASE_URL: Supabase instance URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 *   NOTE: Service role key is required because RLS policies prevent anonymous clients
 *   from reading user_offer records. This key bypasses RLS for cleanup operations.
 * - E2E_USERNAME_ID: Test user ID for filtering test data
 *
 * Note: Console statements are intentional for teardown logging
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import * as dotenv from "dotenv";
import * as path from "node:path";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

async function globalTeardown() {
  console.log("\n🧹 Starting E2E test teardown...");

  const supabaseUrl = process.env.SUPABASE_URL;
  // Use service role key to bypass RLS policies
  // RLS policies on user_offer only allow authenticated users to SELECT,
  // so we need service role key to read and delete test data
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const e2eUserId = process.env.E2E_USERNAME_ID;

  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Missing required environment variables:");
    if (!supabaseUrl) console.error("  - SUPABASE_URL");
    if (!supabaseServiceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    console.error("Please check your .env.test file");
    console.error("\nNOTE: SUPABASE_SERVICE_ROLE_KEY is required to bypass RLS policies.");
    console.error("      Without it, the teardown cannot access user_offer records.");
    process.exit(1);
  }

  if (!e2eUserId) {
    console.warn("⚠️  E2E_USERNAME_ID not set - will clean all offers (use with caution!)");
  }

  try {
    // Create Supabase client with service role key to bypass RLS
    // This is necessary because RLS policies on user_offer only allow
    // authenticated users to SELECT, but we need to clean up test data
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("🔌 Connected to Supabase (using service role key to bypass RLS)");

    // Clean up test data
    // If E2E_USERNAME_ID is set, delete all test data for that user
    // Otherwise, delete all data (dangerous - only for isolated test environments)

    if (e2eUserId) {
      console.log(`🗑️  Deleting test data for user: ${e2eUserId}`);

      // Step 1: Get all offer IDs for this user
      const { data: userOffers, error: fetchError } = await supabase
        .from("user_offer")
        .select("offer_id")
        .eq("user_id", e2eUserId);

      if (fetchError) {
        console.error("❌ Error fetching user offers:", fetchError);
        throw fetchError;
      }

      const offerIds = userOffers?.map((uo) => uo.offer_id) || [];
      console.log(`📋 Found ${offerIds.length} offers associated with test user`);

      // Step 2: Delete from user_offer table
      const { error: userOfferError, count: userOfferCount } = await supabase
        .from("user_offer")
        .delete()
        .eq("user_id", e2eUserId);

      if (userOfferError) {
        console.error("❌ Error cleaning user_offer table:", userOfferError);
        throw userOfferError;
      }

      console.log(`✅ Deleted ${userOfferCount ?? 0} user_offer records`);

      // Step 3: Delete from price_history table for these offers
      if (offerIds.length > 0) {
        const { error: priceHistoryError, count: priceHistoryCount } = await supabase
          .from("price_history")
          .delete()
          .in("offer_id", offerIds);

        if (priceHistoryError) {
          console.error("❌ Error cleaning price_history table:", priceHistoryError);
          throw priceHistoryError;
        }

        console.log(`✅ Deleted ${priceHistoryCount ?? 0} price_history records`);

        // Step 4: Delete from offers table
        const { error: offersError, count: offersCount } = await supabase.from("offers").delete().in("id", offerIds);

        if (offersError) {
          console.error("❌ Error cleaning offers table:", offersError);
          throw offersError;
        }

        console.log(`✅ Deleted ${offersCount ?? 0} offers`);
      }
    } else {
      console.log("⚠️  No user filter - deleting ALL data from database!");
      console.log("   This should only happen in isolated test environments.");

      // Step 1: Delete all user_offer records
      const { error: userOfferError, count: userOfferCount } = await supabase
        .from("user_offer")
        .delete()
        .neq("offer_id", 0); // Delete all rows (offer_id is always > 0)

      if (userOfferError) {
        console.error("❌ Error cleaning user_offer table:", userOfferError);
        throw userOfferError;
      }

      console.log(`✅ Deleted ${userOfferCount ?? 0} user_offer records`);

      // Step 2: Delete all price_history records
      const { error: priceHistoryError, count: priceHistoryCount } = await supabase
        .from("price_history")
        .delete()
        .neq("id", 0); // Delete all rows

      if (priceHistoryError) {
        console.error("❌ Error cleaning price_history table:", priceHistoryError);
        throw priceHistoryError;
      }

      console.log(`✅ Deleted ${priceHistoryCount ?? 0} price_history records`);

      // Step 3: Delete all offers
      const { error: offersError, count: offersCount } = await supabase.from("offers").delete().neq("id", 0); // Delete all rows

      if (offersError) {
        console.error("❌ Error cleaning offers table:", offersError);
        throw offersError;
      }

      console.log(`✅ Deleted ${offersCount ?? 0} offers`);
    }

    console.log("✨ E2E test teardown completed successfully\n");
  } catch (error) {
    console.error("❌ Error during teardown:", error);
    // Don't fail the test run if teardown fails
    // Just log the error
    console.error("⚠️  Teardown failed but not blocking test results");
  }
}

export default globalTeardown;
