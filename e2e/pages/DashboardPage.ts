import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { DashboardStatsComponent } from './components/DashboardStatsComponent';
import { OfferFormComponent } from './components/OfferFormComponent';
import { OfferGridComponent } from './components/OfferGridComponent';

/**
 * Page Object Model for Dashboard page
 * Main dashboard page that composes multiple components
 */
export class DashboardPage extends BasePage {
  readonly header: Locator;
  readonly logoutButton: Locator;
  readonly settingsLink: Locator;
  
  // Component-based POM
  readonly stats: DashboardStatsComponent;
  readonly offerForm: OfferFormComponent;
  readonly offerGrid: OfferGridComponent;

  constructor(page: Page) {
    super(page);
    this.header = page.locator('header');
    this.logoutButton = page.locator('button:has-text("Wyloguj")');
    this.settingsLink = page.locator('a[href="/settings"]');
    
    // Initialize component POMs
    this.stats = new DashboardStatsComponent(page);
    this.offerForm = new OfferFormComponent(page);
    this.offerGrid = new OfferGridComponent(page);
  }

  /**
   * Navigate to dashboard page
   */
  async navigate() {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Check if user is logged in (dashboard is visible)
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.header.isVisible();
  }

  /**
   * Click logout button
   */
  async logout() {
    await this.logoutButton.click();
  }

  /**
   * Navigate to settings
   */
  async goToSettings() {
    await this.settingsLink.click();
  }

  /**
   * Wait for dashboard to be fully loaded
   */
  async waitForDashboardLoaded() {
    await this.stats.waitForLoaded();
    await this.offerForm.isVisible();
  }

  // ====================================
  // Convenience methods that delegate to components
  // ====================================

  /**
   * Get number of offers displayed
   * @deprecated Use offerGrid.getOffersCount() directly
   */
  async getOffersCount(): Promise<number> {
    return await this.offerGrid.getOffersCount();
  }

  /**
   * Check if empty state is displayed
   * @deprecated Use offerGrid.isEmpty() directly
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.offerGrid.isEmpty();
  }

  /**
   * Click on specific offer card
   * @deprecated Use offerGrid.getOfferCard(index).click() directly
   */
  async clickOfferCard(index: number) {
    const card = this.offerGrid.getOfferCard(index);
    await card.click();
  }

  // ====================================
  // High-level workflow methods
  // ====================================

  /**
   * Complete workflow: Add a new offer and wait for it to appear
   * @param url - The offer URL to add
   */
  async addOfferAndWait(url: string) {
    const initialCount = await this.offerGrid.getOffersCount();
    
    await this.offerForm.submitOffer(url);
    await this.offerForm.waitForSuccess();
    await this.offerGrid.waitForLoaded();
    
    if (initialCount === 0) {
      // Wait for grid to appear (from empty state)
      await this.offerGrid.waitForOffersCount(1);
    } else {
      // Wait for new offer to appear
      await this.offerGrid.waitForNewOffer(initialCount);
    }
    
    // Wait for stats to update
    await this.stats.waitForActiveOffersCount(initialCount + 1);
  }

  /**
   * Verify dashboard shows correct state after adding offer
   */
  async verifyOfferAdded(expectedTitle?: string): Promise<boolean> {
    // Check stats updated
    const hasStats = await this.stats.hasActiveOffersCard();
    const activeCount = await this.stats.getActiveOffersCount();
    
    // Check grid has offers
    const hasOffers = await this.offerGrid.hasOffers();
    const offersCount = await this.offerGrid.getOffersCount();
    
    // Check counts match
    const countsMatch = activeCount === offersCount;
    
    // Optionally check for specific title
    let titleMatch = true;
    if (expectedTitle) {
      titleMatch = await this.offerGrid.hasOfferWithTitle(expectedTitle);
    }
    
    return hasStats && hasOffers && countsMatch && titleMatch;
  }
}

