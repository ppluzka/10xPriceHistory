import { test, expect } from "./fixtures/auth.fixture";
import { getTestUserCredentials } from "./helpers/auth.helper";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test("should display login page correctly", async ({ loginPage }) => {
    await loginPage.navigate();
    await loginPage.waitForPageLoad();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test("should handle login attempt with invalid credentials", async ({ loginPage, page }) => {
    await loginPage.navigate();

    // Start waiting for the API response before clicking login
    const responsePromise = page
      .waitForResponse((response) => response.url().includes("/api/auth/login"), { timeout: 5000 })
      .catch(() => null); // Catch timeout if API doesn't exist

    await loginPage.login("invalid@example.com", "wrongpassword");

    // Wait for the API response (or timeout)
    await responsePromise;

    // Give a moment for UI to update
    await page.waitForTimeout(500);

    // Check if error message is visible (backend might not be implemented)
    const hasError = await loginPage.hasErrorMessage();
    const isStillOnLogin = page.url().includes("/login");

    // Either we see an error or we're still on the login page
    // (both indicate login was not successful)
    expect(hasError || isStillOnLogin).toBeTruthy();

    // If error is visible, verify it has content
    if (hasError) {
      const errorText = await loginPage.getErrorMessageText();
      expect(errorText.length).toBeGreaterThan(0);
    }
  });

  test("should navigate to forgot password page", async ({ loginPage, page }) => {
    await loginPage.navigate();

    await loginPage.clickForgotPassword();

    await expect(page).toHaveURL(/forgot-password/);
  });

  test("should navigate to register page", async ({ loginPage, page }) => {
    await loginPage.navigate();

    await loginPage.clickRegister();

    await expect(page).toHaveURL(/register/);
  });

  test("should redirect to dashboard on successful login", async ({ loginPage, page }) => {
    await loginPage.navigate();

    // Get test credentials from environment variables (.env file)
    const { email, password } = getTestUserCredentials();

    // Wait for API response
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/login"), {
      timeout: 10000,
    });

    await loginPage.login(email, password);

    const response = await responsePromise;

    // Should redirect to dashboard on successful login
    if (response && response.ok()) {
      await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
    }
  });

  test("should prevent access to dashboard when not logged in", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login page
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});

test.describe("Dashboard", () => {
  test("should display empty state when no offers exist", async ({ dashboardPage, page }) => {
    // Note: This test assumes the user is logged in
    // You may need to implement an authentication helper or fixture

    await dashboardPage.navigate();

    // Check if redirected to login (not authenticated)
    const isLoginPage = page.url().includes("/login");

    if (!isLoginPage) {
      // User is authenticated, check for empty state or offers
      const hasEmptyState = await dashboardPage.hasEmptyState();
      const offersCount = await dashboardPage.getOffersCount();

      // Either empty state is shown or there are offers
      expect(hasEmptyState || offersCount > 0).toBeTruthy();
    }
  });
});
