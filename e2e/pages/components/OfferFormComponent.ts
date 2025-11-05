import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Offer Form Component
 * Handles interactions with the offer addition form
 */
export class OfferFormComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly urlInput: Locator;
  readonly submitButton: Locator;
  readonly validationError: Locator;
  readonly submitError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("offer-form");
    this.urlInput = page.getByTestId("offer-url-input");
    this.submitButton = page.getByTestId("offer-submit-button");
    this.validationError = page.getByTestId("offer-validation-error");
    this.submitError = page.getByTestId("offer-submit-error");
  }

  /**
   * Check if the form is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Fill the URL input field
   */
  async fillUrl(url: string) {
    await this.urlInput.fill(url);
  }

  /**
   * Clear the URL input field
   */
  async clearUrl() {
    await this.urlInput.clear();
  }

  /**
   * Get the current value of URL input
   */
  async getUrlValue(): Promise<string> {
    return await this.urlInput.inputValue();
  }

  /**
   * Click the submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Submit the form with a URL
   */
  async submitOffer(url: string) {
    await this.fillUrl(url);
    await this.clickSubmit();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if submit button shows loading state
   */
  async isSubmitting(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text?.includes("Dodawanie...") || false;
  }

  /**
   * Check if validation error is visible
   */
  async hasValidationError(): Promise<boolean> {
    return await this.validationError.isVisible();
  }

  /**
   * Get validation error message
   */
  async getValidationError(): Promise<string> {
    return (await this.validationError.textContent()) || "";
  }

  /**
   * Check if submit error is visible
   */
  async hasSubmitError(): Promise<boolean> {
    return await this.submitError.isVisible();
  }

  /**
   * Get submit error message
   */
  async getSubmitError(): Promise<string> {
    return (await this.submitError.textContent()) || "";
  }

  /**
   * Wait for form to be ready (not submitting)
   */
  async waitForReady() {
    await this.submitButton.waitFor({ state: "visible" });
    await this.page.waitForFunction((buttonSelector) => {
      const button = document.querySelector(buttonSelector);
      return button?.textContent?.includes("Dodaj ofertę");
    }, '[data-testid="offer-submit-button"]');
  }

  /**
   * Wait for successful submission (form clears)
   */
  async waitForSuccess() {
    await this.page.waitForFunction((inputSelector) => {
      const input = document.querySelector(inputSelector) as HTMLInputElement;
      return input?.value === "";
    }, '[data-testid="offer-url-input"]');
  }
}
