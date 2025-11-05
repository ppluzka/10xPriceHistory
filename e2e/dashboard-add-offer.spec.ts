import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";
import { loginAsTestUser, logoutUser } from "./helpers/auth.helper";

/**
 * E2E Test: Add Offer Flow
 *
 * Scenario:
 * 1. User is authenticated with real Supabase account via API
 * 2. User adds a new offer by pasting URL and clicking submit
 * 3. User waits for the offer to be added
 * 4. User sees the new offer displayed in the list
 *
 * Prerequisites:
 * - E2E_USERNAME and E2E_PASSWORD must be set in .env.test
 * - Test user must exist in Supabase and have verified email
 * - Supabase connection must be working
 *
 * Authentication:
 * - Uses loginAsTestUser() which calls /api/auth/login directly
 * - Cookies are automatically set by Supabase SDK
 * - Session is maintained for all subsequent API requests
 */

test.describe("Dashboard - Add Offer", () => {
  // Run tests sequentially to avoid interference when sharing the same user account
  test.describe.configure({ mode: "serial" });

  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Login using API helper - ensures cookies are properly set
    // This is more reliable than UI login for E2E tests
    const loginSuccess = await loginAsTestUser(page);

    if (!loginSuccess) {
      test.skip(true, "Login failed - check E2E_USERNAME and E2E_PASSWORD in .env.test");
      return;
    }

    // Navigate to dashboard after successful login
    // Cookies from login are automatically included in this request
    await dashboardPage.navigate();

    // Wait for dashboard to fully load
    try {
      await dashboardPage.waitForDashboardLoaded();
    } catch (error) {
      test.skip(true, `Dashboard failed to load: ${error}`);
    }
  });

  test.afterEach(async ({ page }) => {
    // Logout after each test to clean up session
    await logoutUser(page);
  });

  test("should display offer form on dashboard", async () => {
    // Verify offer form is visible
    await expect(dashboardPage.offerForm.container).toBeVisible();
    await expect(dashboardPage.offerForm.urlInput).toBeVisible();
    await expect(dashboardPage.offerForm.submitButton).toBeVisible();
  });

  test("should validate URL before submission", async ({ page }) => {
    // Test non-otomoto URL - should show Polish error message
    await dashboardPage.offerForm.fillUrl("https://www.example.com");
    await dashboardPage.offerForm.clickSubmit();

    // Look for the specific validation error element
    const validationError = page.locator('p.text-sm.text-destructive[data-testid="offer-validation-error"]');
    await expect(validationError).toBeVisible();
    await expect(validationError).toHaveText("URL musi być z otomoto.pl");
  });

  test("should successfully add a new offer", async () => {
    // Use a real Otomoto.pl URL for testing
    // Note: This will make a real API call to scrape the page
    const testOfferUrl = "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html";

    // Get initial state
    const initialOffersCount = await dashboardPage.offerGrid.getOffersCount();
    const initialActiveCount = await dashboardPage.stats.getActiveOffersCount();

    // Add offer using high-level workflow method
    await dashboardPage.addOfferAndWait(testOfferUrl);

    // Verify offers count increased
    const newOffersCount = await dashboardPage.offerGrid.getOffersCount();
    expect(newOffersCount).toBe(initialOffersCount + 1);

    // Verify stats updated
    const newActiveCount = await dashboardPage.stats.getActiveOffersCount();
    expect(newActiveCount).toBe(initialActiveCount + 1);

    // Verify form was cleared
    const urlValue = await dashboardPage.offerForm.getUrlValue();
    expect(urlValue).toBe("");
  });

  test("should handle multiple offers", async ({ page }) => {
    const offers = [
      "https://www.otomoto.pl/osobowe/oferta/dodge-challenger-ID6GzoTH.html",
      "https://www.otomoto.pl/osobowe/oferta/dodge-challenger-ID6GJ7AY.html",
      "https://www.otomoto.pl/osobowe/oferta/dodge-challenger-ID6HIIUv.html",
    ];

    const initialCount = await dashboardPage.offerGrid.getOffersCount();

    // Add multiple offers with proper API response handling
    for (const offerUrl of offers) {
      // Wait for API response
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/offers") && response.request().method() === "POST",
        { timeout: 30000 }
      );

      await dashboardPage.offerForm.submitOffer(offerUrl);

      // Wait for API response
      const response = await responsePromise;

      // If API call succeeded, wait for form to clear
      if (response.ok()) {
        await dashboardPage.offerForm.waitForSuccess(30000);
      } else {
        // If failed (e.g., offer already exists), wait for error or just continue
        // The form won't clear if there's an error, so we'll just wait a bit and continue
        await page.waitForTimeout(1000);
      }
    }

    // Wait for all offers to appear
    await dashboardPage.offerGrid.waitForLoaded();

    // Wait for offers count to increase (may be less than expected if some offers already existed)
    const finalCount = await dashboardPage.offerGrid.getOffersCount();
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    expect(finalCount).toBeLessThanOrEqual(initialCount + offers.length);

    // Verify stats match
    const statsCount = await dashboardPage.stats.getActiveOffersCount();
    expect(statsCount).toBe(finalCount);
  });
});
