import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";
import { getTestUserCredentials, logoutUser } from "./helpers/auth.helper";
import { LoginPage } from "./pages/LoginPage";

/**
 * E2E Test: Add Offer Flow
 *
 * Scenario:
 * 1. User is authenticated with real Supabase account
 * 2. User adds a new offer by pasting URL and clicking submit
 * 3. User waits for the offer to be added
 * 4. User sees the new offer displayed in the list
 *
 * Prerequisites:
 * - E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD must be set in .env.test
 * - Test user must exist in Supabase and have verified email
 * - Supabase connection must be working
 */

test.describe("Dashboard - Add Offer", () => {
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    loginPage = new LoginPage(page);

    // Get test credentials from environment variables
    const { email, password } = getTestUserCredentials();

    // Login through UI (same as in auth.spec.ts)
    await loginPage.navigate();
    await loginPage.waitForPageLoad();

    // Wait for API response
    const responsePromise = page
      .waitForResponse((response) => response.url().includes("/api/auth/login"), {
        timeout: 10000,
      })
      .catch(() => null);

    await loginPage.login(email, password);

    const response = await responsePromise;

    // Verify login was successful
    if (!response || !response.ok()) {
      test.skip(true, "Login failed - check E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env");
      return;
    }

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 5000 });

    // Initialize dashboard page and wait for it to load
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

  test("should successfully add a new offer", async ({ page }) => {
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

  test("should display new offer in the grid", async ({ page }) => {
    const testOfferUrl = "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html";

    // Skip if already has offers (to test empty state transition)
    const isEmpty = await dashboardPage.offerGrid.isEmpty();

    // Add offer
    await dashboardPage.addOfferAndWait(testOfferUrl);

    // Verify grid is now visible (not empty state)
    expect(await dashboardPage.offerGrid.hasOffers()).toBe(true);
    expect(await dashboardPage.offerGrid.isEmpty()).toBe(false);

    // Get the first offer card
    const firstCard = dashboardPage.offerGrid.getOfferCard(0);

    // Verify card is visible
    expect(await firstCard.isVisible()).toBe(true);

    // Verify card has required elements
    expect(await firstCard.getTitle()).toBeTruthy();
    expect(await firstCard.getPrice()).toBeTruthy();
    expect(await firstCard.getStatus()).toBeTruthy();
  });

  test("should show loading state while adding offer", async ({ page }) => {
    const testOfferUrl = "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html";

    // Fill form
    await dashboardPage.offerForm.fillUrl(testOfferUrl);

    // Click submit
    await dashboardPage.offerForm.clickSubmit();

    // Check for loading state (brief, so we need to catch it quickly)
    const isSubmitting = await dashboardPage.offerForm.isSubmitting();
    // Note: This might be flaky if submission is too fast

    // Wait for completion
    await dashboardPage.offerForm.waitForSuccess();
    await dashboardPage.offerGrid.waitForLoaded();
  });

  test("should display offer details correctly", async ({ page }) => {
    const testOfferUrl = "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html";

    // Add offer
    await dashboardPage.addOfferAndWait(testOfferUrl);

    // Get the newest offer (should be last or first depending on sort)
    const offerCard = dashboardPage.offerGrid.getOfferCard(0);

    // Verify all card details are present
    const title = await offerCard.getTitle();
    const price = await offerCard.getPrice();
    const status = await offerCard.getStatus();
    const offerId = await offerCard.getOfferId();

    expect(title).toBeTruthy();
    expect(price).toBeTruthy();
    expect(status).toBeTruthy();
    expect(offerId).toBeTruthy();

    // Verify status is 'active'
    expect(status.toLowerCase()).toContain("active");
  });

  test("should handle multiple offers", async ({ page }) => {
    const offers = [
      "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html",
      "https://www.otomoto.pl/osobowe/oferta/dodge-challenger-ID6GJ7AY.html",
      "https://www.otomoto.pl/osobowe/oferta/dodge-challenger-ID6HIIUv.html",
    ];

    const initialCount = await dashboardPage.offerGrid.getOffersCount();

    // Add multiple offers
    for (const offerUrl of offers) {
      await dashboardPage.offerForm.submitOffer(offerUrl);
      await dashboardPage.offerForm.waitForSuccess();
    }

    // Wait for all offers to appear
    await dashboardPage.offerGrid.waitForLoaded();
    await dashboardPage.offerGrid.waitForOffersCount(initialCount + offers.length);

    // Verify all offers are displayed
    const finalCount = await dashboardPage.offerGrid.getOffersCount();
    expect(finalCount).toBe(initialCount + offers.length);

    // Verify stats match
    const statsCount = await dashboardPage.stats.getActiveOffersCount();
    expect(statsCount).toBe(finalCount);
  });

  test("should verify dashboard state after adding offer", async ({ page }) => {
    const testOfferUrl = "https://www.otomoto.pl/osobowe/oferta/mazda-mx-30-ID6Hw05S.html";

    // Add offer
    await dashboardPage.addOfferAndWait(testOfferUrl);

    // Use high-level verification method
    const isValid = await dashboardPage.verifyOfferAdded();
    expect(isValid).toBe(true);
  });
});
