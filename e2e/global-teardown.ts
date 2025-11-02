/* eslint-disable no-console */
/**
 * Global E2E Teardown Script
 *
 * This script runs after ALL E2E tests have completed.
 * It cleans up the Supabase test database by removing test data.
 *
 * Environment variables required (from .env.test):
 * - SUPABASE_URL: Supabase instance URL
 * - SUPABASE_KEY: Supabase anon key
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
  const supabaseKey = process.env.SUPABASE_KEY;
  const e2eUserId = process.env.E2E_USERNAME_ID;

  // Validate environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing required environment variables:");
    if (!supabaseUrl) console.error("  - SUPABASE_URL");
    if (!supabaseKey) console.error("  - SUPABASE_KEY");
    console.error("Please check your .env.test file");
    process.exit(1);
  }

  if (!e2eUserId) {
    console.warn("⚠️  E2E_USERNAME_ID not set - will clean all offers (use with caution!)");
  }

  try {
    // Create Supabase client
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    console.log("🔌 Connected to Supabase");

    // Clean up offers table
    // If E2E_USERNAME_ID is set, only delete offers from user_offer for that user
    // Otherwise, delete all offers (dangerous - only for isolated test environments)

    if (e2eUserId) {
      console.log(`🗑️  Deleting offers for test user: ${e2eUserId}`);

      // Delete from user_offer table (soft delete by setting deleted_at)
      const { error: userOfferError, count: userOfferCount } = await supabase
        .from("user_offer")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", e2eUserId)
        .is("deleted_at", null);

      if (userOfferError) {
        console.error("❌ Error cleaning user_offer table:", userOfferError);
        throw userOfferError;
      }

      console.log(`✅ Soft-deleted ${userOfferCount ?? 0} user offer subscriptions`);

      // Optionally, also clean up orphaned offers that were created during tests
      // (offers that have no active user_offer relationships)
      const { data: orphanedOffers } = await supabase
        .from("offers")
        .select("id")
        .not("id", "in", supabase.from("user_offer").select("offer_id").is("deleted_at", null));

      if (orphanedOffers && orphanedOffers.length > 0) {
        console.log(`🗑️  Found ${orphanedOffers.length} orphaned offers, cleaning up...`);

        const offerIds = orphanedOffers.map((o) => o.id);
        const { error: deleteError } = await supabase.from("offers").delete().in("id", offerIds);

        if (deleteError) {
          console.warn("⚠️  Warning: Could not delete orphaned offers:", deleteError.message);
        } else {
          console.log(`✅ Deleted ${orphanedOffers.length} orphaned offers`);
        }
      }
    } else {
      console.log("⚠️  No user filter - deleting ALL offers from database!");
      console.log("   This should only happen in isolated test environments.");

      // First, delete all user_offer records (no id column, use offer_id)
      const { error: userOfferError, count: userOfferCount } = await supabase
        .from("user_offer")
        .delete()
        .neq("offer_id", 0); // Delete all rows (offer_id is always > 0)

      if (userOfferError) {
        console.error("❌ Error cleaning user_offer table:", userOfferError);
        throw userOfferError;
      }

      console.log(`✅ Deleted ${userOfferCount ?? 0} user offer subscriptions`);

      // Then delete all offers
      const { error: deleteError, count } = await supabase.from("offers").delete().neq("id", 0); // Delete all rows

      if (deleteError) {
        console.error("❌ Error cleaning offers table:", deleteError);
        throw deleteError;
      }

      console.log(`✅ Deleted ${count ?? 0} offers from database`);
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
