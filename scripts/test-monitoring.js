#!/usr/bin/env node

/**
 * Script to manually trigger price monitoring endpoint
 * Usage: node scripts/test-monitoring.js [--port 3000] [--secret YOUR_SECRET]
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find((arg) => arg.startsWith("--port="));
const secretArg = args.find((arg) => arg.startsWith("--secret="));
// Default to 3001 (Astro dev server default) or use --port= argument
const port = portArg ? portArg.split("=")[1] : "3001";
const secret = secretArg ? secretArg.split("=")[1] : null;

// Try to read CRON_SECRET from .env file
let cronSecret = secret;

if (!cronSecret) {
  const envPath = resolve(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    const secretMatch = envContent.match(/CRON_SECRET=(.+)/);
    if (secretMatch) {
      cronSecret = secretMatch[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

if (!cronSecret) {
  console.error("❌ CRON_SECRET not found!");
  console.error("\nPlease provide CRON_SECRET in one of these ways:");
  console.error("  1. Set it in .env file: CRON_SECRET=your-secret");
  console.error("  2. Pass as argument: node scripts/test-monitoring.js --secret=your-secret");
  console.error("  3. Use environment variable: CRON_SECRET=your-secret node scripts/test-monitoring.js");
  process.exit(1);
}

const url = `http://localhost:${port}/api/cron/check-prices`;

console.log("🚀 Testing price monitoring endpoint...");
console.log(`📍 URL: ${url}`);
console.log(`🔐 Using secret: ${cronSecret.substring(0, 8)}...`);
console.log("");

try {
  console.log("📤 Sending request...");
  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ triggered_by: "manual_test" }),
  });

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱️  Response received in ${elapsedTime}s\n`);

  // Get response text first to handle both JSON and HTML
  const responseText = await response.text();

  console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
  console.log(`📋 Content-Type: ${response.headers.get("content-type") || "unknown"}\n`);

  // Try to parse as JSON
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    // If not JSON, it's probably HTML (error page)
    console.error("❌ Response is not JSON (likely an error page):");
    console.error("─".repeat(60));

    // Show first 500 chars of HTML response
    const preview = responseText.substring(0, 500);
    console.error(preview);
    if (responseText.length > 500) {
      console.error(`\n... (${responseText.length - 500} more characters)`);
    }
    console.error("─".repeat(60));

    console.error("\n💡 Possible issues:");
    console.error("   1. Dev server is not running - run: npm run dev");
    console.error("   2. Endpoint path is incorrect");
    console.error("   3. Server is returning an error page");
    console.error("   4. Check server logs for more details");

    process.exit(1);
  }

  if (response.ok) {
    console.log("✅ Success!");
    console.log(JSON.stringify(data, null, 2));

    if (data.processed !== undefined) {
      console.log(`\n📊 Processed ${data.processed} offers`);
    }
  } else {
    console.error("❌ Error:", response.status, response.statusText);
    console.error(JSON.stringify(data, null, 2));

    if (data.error === "Unauthorized") {
      console.error("\n💡 Authentication failed. Check:");
      console.error("   1. CRON_SECRET in .env matches the one in database");
      console.error("   2. Authorization header is correct");
    }

    process.exit(1);
  }
} catch (error) {
  if (error.code === "ECONNREFUSED") {
    console.error("❌ Connection refused - server is not running!");
    console.error("\n💡 Start the dev server first:");
    console.error("   npm run dev");
  } else {
    console.error("❌ Request failed:", error.message);
    console.error("\n💡 Make sure the dev server is running:");
    console.error("   npm run dev");
  }
  process.exit(1);
}
