import { Page, Locator } from "@playwright/test";
import { OfferCardComponent } from "./OfferCardComponent";

/**
 * Page Object Model for Offer Grid Component
 * Handles interactions with the offers list/grid
 */
export class OfferGridComponent {
  readonly page: Page;
  readonly loadingSkeleton: Locator;
  readonly emptyState: Locator;
  readonly section: Locator;
  readonly grid: Locator;
  readonly offerCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSkeleton = page.getByTestId("offers-loading");
    this.emptyState = page.getByTestId("offers-empty-state");
    this.section = page.getByTestId("offers-section");
    this.grid = page.getByTestId("offers-grid");
    this.offerCards = page.getByTestId("offer-card");
  }

  /**
   * Check if loading skeleton is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSkeleton.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoaded() {
    await this.loadingSkeleton.waitFor({ state: "hidden", timeout: 10000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmpty(): Promise<boolean> {
    try {
      return await this.emptyState.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if offers grid is visible
   */
  async hasOffers(): Promise<boolean> {
    try {
      return await this.grid.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Get the number of displayed offer cards
   */
  async getOffersCount(): Promise<number> {
    if (await this.isEmpty()) {
      return 0;
    }
    return await this.offerCards.count();
  }

  /**
   * Get offer card by index (0-based)
   */
  getOfferCard(index: number): OfferCardComponent {
    return new OfferCardComponent(this.page, this.offerCards.nth(index));
  }

  /**
   * Get offer card by offer ID
   */
  getOfferCardById(offerId: string): OfferCardComponent {
    const cardLocator = this.page.locator(`[data-testid="offer-card"][data-offer-id="${offerId}"]`);
    return new OfferCardComponent(this.page, cardLocator);
  }

  /**
   * Get all offer cards
   */
  async getAllOfferCards(): Promise<OfferCardComponent[]> {
    const count = await this.getOffersCount();
    const cards: OfferCardComponent[] = [];

    for (let i = 0; i < count; i++) {
      cards.push(this.getOfferCard(i));
    }

    return cards;
  }

  /**
   * Wait for a new offer to appear in the grid
   * @param previousCount - The count before adding the offer
   */
  async waitForNewOffer(previousCount: number) {
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const cards = document.querySelectorAll(selector);
        return cards.length === expected;
      },
      { selector: '[data-testid="offer-card"]', expected: previousCount + 1 },
      { timeout: 10000 }
    );
  }

  /**
   * Wait for specific number of offers
   */
  async waitForOffersCount(expectedCount: number) {
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const cards = document.querySelectorAll(selector);
        return cards.length === expected;
      },
      { selector: '[data-testid="offer-card"]', expected: expectedCount },
      { timeout: 10000 }
    );
  }

  /**
   * Click on first offer card
   */
  async clickFirstOffer() {
    await this.offerCards.first().click();
  }

  /**
   * Get titles of all offers
   */
  async getAllOfferTitles(): Promise<string[]> {
    const cards = await this.getAllOfferCards();
    const titles: string[] = [];

    for (const card of cards) {
      titles.push(await card.getTitle());
    }

    return titles;
  }

  /**
   * Check if offer with specific title exists
   */
  async hasOfferWithTitle(title: string): Promise<boolean> {
    const titles = await this.getAllOfferTitles();
    return titles.some((t) => t.includes(title));
  }
}
