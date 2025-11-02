import { Page } from "@playwright/test";

/**
 * Authentication helper for E2E tests
 * Provides methods to authenticate with real Supabase users
 */

/**
 * Login with real user credentials via API
 *
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @returns True if login successful, false otherwise
 */
export async function loginUser(page: Page, email: string, password: string): Promise<boolean> {
  try {
    // Navigate to a page first to establish context
    await page.goto("/");

    // Call the login API
    const response = await page.request.post("/api/auth/login", {
      data: {
        email,
        password,
      },
    });

    if (response.ok()) {
      // Login successful - cookies are automatically set by Supabase
      const data = await response.json();
      console.log("✅ Login successful:", data.user.email);
      return true;
    } else {
      const error = await response.json();
      console.error("❌ Login failed:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    return false;
  }
}

/**
 * Logout current user via API
 * @param page - Playwright page instance
 */
export async function logoutUser(page: Page): Promise<void> {
  try {
    await page.request.post("/api/auth/logout");
    console.log("✅ Logout successful");
  } catch (error) {
    console.error("❌ Logout error:", error);
  }
}

/**
 * Get test user credentials from environment variables
 * @returns Test user email and password
 */
export function getTestUserCredentials(): { email: string; password: string } {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test file");
  }

  return { email, password };
}

/**
 * Login with test user from environment variables
 * This is the main function to use in E2E tests
 *
 * @param page - Playwright page instance
 * @returns True if login successful, false otherwise
 */
export async function loginAsTestUser(page: Page): Promise<boolean> {
  const { email, password } = getTestUserCredentials();
  return await loginUser(page, email, password);
}

/**
 * Check if currently on login page (redirected due to no auth)
 * @param page - Playwright page instance
 */
export function isOnLoginPage(page: Page): boolean {
  return page.url().includes("/login");
}

/**
 * Wait for authentication redirect (if any)
 * @param page - Playwright page instance
 * @param timeout - Timeout in ms (default: 3000)
 */
export async function waitForAuthRedirect(page: Page, timeout = 3000): Promise<boolean> {
  try {
    await page.waitForURL("**/login*", { timeout });
    return true; // Redirected to login (not authenticated)
  } catch {
    return false; // No redirect (authenticated or no auth required)
  }
}

/**
 * Register a new test user (useful for test setup)
 * Note: Email verification is required before login
 *
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    await page.goto("/");

    const response = await page.request.post("/api/auth/register", {
      data: {
        email,
        password,
      },
    });

    if (response.ok()) {
      const data = await response.json();
      console.log("✅ Registration successful:", email);
      return { success: true, userId: data.user?.id };
    } else {
      const error = await response.json();
      console.error("❌ Registration failed:", error);
      return { success: false, error: error.error };
    }
  } catch (error) {
    console.error("❌ Registration error:", error);
    return { success: false, error: String(error) };
  }
}
