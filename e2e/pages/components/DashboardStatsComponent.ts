import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Dashboard Stats Component
 * Handles interactions with the statistics section
 */
export class DashboardStatsComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly activeOffersCard: Locator;
  readonly activeOffersValue: Locator;
  readonly averageChangeCard: Locator;
  readonly averageChangeValue: Locator;
  readonly largestDropCard: Locator;
  readonly largestDropValue: Locator;
  readonly largestRiseCard: Locator;
  readonly largestRiseValue: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('dashboard-stats');
    this.activeOffersCard = page.getByTestId('stat-card-active-offers');
    this.activeOffersValue = page.getByTestId('stat-value-active-offers');
    this.averageChangeCard = page.getByTestId('stat-card-average-change');
    this.averageChangeValue = page.getByTestId('stat-value-average-change');
    this.largestDropCard = page.getByTestId('stat-card-largest-drop');
    this.largestDropValue = page.getByTestId('stat-value-largest-drop');
    this.largestRiseCard = page.getByTestId('stat-card-largest-rise');
    this.largestRiseValue = page.getByTestId('stat-value-largest-rise');
  }

  /**
   * Check if stats container is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Get active offers count
   */
  async getActiveOffersCount(): Promise<number> {
    const text = await this.activeOffersValue.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get average change percentage as string
   */
  async getAverageChange(): Promise<string> {
    return (await this.averageChangeValue.textContent()) || '';
  }

  /**
   * Get largest drop percentage as string
   */
  async getLargestDrop(): Promise<string> {
    return (await this.largestDropValue.textContent()) || '';
  }

  /**
   * Get largest rise percentage as string
   */
  async getLargestRise(): Promise<string> {
    return (await this.largestRiseValue.textContent()) || '';
  }

  /**
   * Wait for active offers count to change
   * @param expectedCount - The expected count value
   */
  async waitForActiveOffersCount(expectedCount: number) {
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const element = document.querySelector(selector);
        const value = parseInt(element?.textContent || '0', 10);
        return value === expected;
      },
      { selector: '[data-testid="stat-value-active-offers"]', expected: expectedCount },
      { timeout: 10000 }
    );
  }

  /**
   * Check if active offers card is visible
   */
  async hasActiveOffersCard(): Promise<boolean> {
    return await this.activeOffersCard.isVisible();
  }

  /**
   * Check if average change card is visible
   */
  async hasAverageChangeCard(): Promise<boolean> {
    return await this.averageChangeCard.isVisible();
  }

  /**
   * Check if largest drop card is visible
   */
  async hasLargestDropCard(): Promise<boolean> {
    return await this.largestDropCard.isVisible();
  }

  /**
   * Check if largest rise card is visible
   */
  async hasLargestRiseCard(): Promise<boolean> {
    return await this.largestRiseCard.isVisible();
  }

  /**
   * Get all stats as an object
   */
  async getAllStats(): Promise<{
    activeOffers: number;
    averageChange: string;
    largestDrop: string;
    largestRise: string;
  }> {
    return {
      activeOffers: await this.getActiveOffersCount(),
      averageChange: await this.getAverageChange(),
      largestDrop: await this.getLargestDrop(),
      largestRise: await this.getLargestRise(),
    };
  }

  /**
   * Wait for stats to be loaded and visible
   */
  async waitForLoaded() {
    await this.container.waitFor({ state: 'visible', timeout: 5000 });
    await this.activeOffersCard.waitFor({ state: 'visible', timeout: 5000 });
  }
}

