import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Offer Card Component
 * Represents a single offer card in the grid
 */
export class OfferCardComponent {
  readonly page: Page;
  readonly card: Locator;
  readonly link: Locator;
  readonly image: Locator;
  readonly status: Locator;
  readonly title: Locator;
  readonly city: Locator;
  readonly price: Locator;
  readonly priceChange: Locator;
  readonly lastChecked: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page, cardLocator: Locator) {
    this.page = page;
    this.card = cardLocator;
    this.link = cardLocator.getByTestId('offer-card-link');
    this.image = cardLocator.getByTestId('offer-card-image');
    this.status = cardLocator.getByTestId('offer-card-status');
    this.title = cardLocator.getByTestId('offer-card-title');
    this.city = cardLocator.getByTestId('offer-card-city');
    this.price = cardLocator.getByTestId('offer-card-price');
    this.priceChange = cardLocator.getByTestId('offer-card-price-change');
    this.lastChecked = cardLocator.getByTestId('offer-card-last-checked');
    this.deleteButton = cardLocator.getByTestId('offer-card-delete-button');
  }

  /**
   * Check if the card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }

  /**
   * Get the offer ID from data attribute
   */
  async getOfferId(): Promise<string> {
    return (await this.card.getAttribute('data-offer-id')) || '';
  }

  /**
   * Click the card to navigate to offer details
   */
  async click() {
    await this.link.click();
  }

  /**
   * Get the offer title
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  /**
   * Get the offer status
   */
  async getStatus(): Promise<string> {
    return (await this.status.textContent()) || '';
  }

  /**
   * Get the offer city
   */
  async getCity(): Promise<string> {
    try {
      return (await this.city.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Get the current price
   */
  async getPrice(): Promise<string> {
    return (await this.price.textContent()) || '';
  }

  /**
   * Get the price change percentage
   */
  async getPriceChange(): Promise<string> {
    try {
      return (await this.priceChange.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if price change is displayed
   */
  async hasPriceChange(): Promise<boolean> {
    try {
      return await this.priceChange.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  /**
   * Get last checked date text
   */
  async getLastChecked(): Promise<string> {
    try {
      return (await this.lastChecked.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if image is displayed
   */
  async hasImage(): Promise<boolean> {
    try {
      return await this.image.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  /**
   * Hover over card to show delete button
   */
  async hover() {
    await this.card.hover();
  }

  /**
   * Click delete button (requires hover first or force click)
   */
  async clickDelete() {
    await this.hover();
    await this.deleteButton.click({ force: true });
  }

  /**
   * Check if delete button is visible
   */
  async isDeleteButtonVisible(): Promise<boolean> {
    try {
      return await this.deleteButton.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }
}

