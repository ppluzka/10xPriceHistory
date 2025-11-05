import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Login page
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    // Use data-testid for more reliable selection
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.loginButton = page.getByTestId("login-submit-button");
    this.errorMessage = page.getByTestId("login-error-message");
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.registerLink = page.locator('a[href="/register"]');
  }

  /**
   * Navigate to login page
   */
  async navigate() {
    await this.goto("/login");
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string) {
    // Fill email field - use type to trigger proper React events
    await this.emailInput.clear();
    await this.emailInput.type(email, { delay: 50 });

    // Fill password field - use type to trigger proper React events
    await this.passwordInput.clear();
    await this.passwordInput.type(password, { delay: 50 });

    // Wait for button to be visible
    await this.loginButton.waitFor({ state: "visible" });

    // Wait for button to become enabled
    // The button is disabled when: isLoading || !email.trim() || !password
    // Use waitFor with enabled check - this polls until condition is met
    await this.loginButton.waitFor({ enabled: true, timeout: 10000 });

    // Click the now-enabled button
    await this.loginButton.click();
  }

  /**
   * Check if login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  /**
   * Wait for login button to be enabled
   */
  async waitForLoginButtonEnabled() {
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('[data-testid="login-submit-button"]') as HTMLButtonElement;
        return button && !button.disabled;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessageText(): Promise<string> {
    return await this.getTextContent(this.errorMessage);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click register link
   */
  async clickRegister() {
    await this.registerLink.click();
  }
}
