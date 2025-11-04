import * as cheerio from "cheerio";
import type { ExtractedPrice } from "../../types";

/**
 * ScrapingService - Handles web scraping for offer pages
 *
 * Responsibilities:
 * - Fetch HTML from offer URLs with User-Agent rotation
 * - Parse HTML using Cheerio.js
 * - Extract price using saved CSS/XPath selector
 * - Implement delays 2-5s between requests
 * - Handle HTTP errors (404, 410, timeout, etc.)
 *
 * Reference: Implementation Plan Section 3.1
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const SCRAPING_CONFIG = {
  timeout: 30000, // 30s
  minDelay: 2000, // 2s
  maxDelay: 5000, // 5s
  maxRetries: 3,
  retryDelays: [60000, 300000, 900000], // 1min, 5min, 15min
};

export class ScrapingService {
  /**
   * Gets a random User-Agent from the pool
   * @returns Random User-Agent string
   * @private
   */
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Creates a delay promise
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets a random delay between min and max delay
   * @returns Random delay in milliseconds
   * @private
   */
  private getRandomDelay(): number {
    return Math.floor(Math.random() * (SCRAPING_CONFIG.maxDelay - SCRAPING_CONFIG.minDelay) + SCRAPING_CONFIG.minDelay);
  }

  /**
   * Fetches HTML content from an offer page
   * @param url - The URL to fetch
   * @returns Promise resolving to HTML string
   * @throws Error if fetch fails or times out
   */
  async fetchOfferPage(url: string): Promise<string> {
    const userAgent = this.getRandomUserAgent();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPING_CONFIG.timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Add delay before next request
      await this.delay(this.getRandomDelay());

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Extracts price from HTML using a CSS selector
   * @param html - The HTML content to parse
   * @param selector - CSS selector for the price element
   * @returns Promise resolving to ExtractedPrice or null if not found
   */
  async extractPriceWithSelector(html: string, selector: string): Promise<ExtractedPrice | null> {
    const $ = cheerio.load(html);
    const element = $(selector);

    if (!element.length) {
      return null;
    }

    const rawValue = element.text().trim();
    const priceMatch = rawValue.match(/[\d\s]+/);

    if (!priceMatch) {
      return null;
    }

    const priceString = priceMatch[0].replace(/\s/g, "");
    const price = parseFloat(priceString);

    if (isNaN(price)) {
      return null;
    }

    // Extract currency
    const currencyMatch = rawValue.match(/PLN|EUR|USD|GBP/);
    const currency = currencyMatch ? currencyMatch[0] : "PLN";

    return {
      price,
      currency,
      rawValue,
    };
  }

  /**
   * Checks if an offer has been removed based on HTTP status code
   * @param statusCode - HTTP status code to check
   * @returns True if offer is removed (404 or 410), false otherwise
   */
  isOfferRemoved(statusCode: number): boolean {
    return statusCode === 404 || statusCode === 410;
  }
}
