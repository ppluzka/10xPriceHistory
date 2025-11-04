import type { ExtractedPrice, ValidationResult } from "../../types";

/**
 * ValidationService - Validates extracted price data
 *
 * Responsibilities:
 * - Validate price range (>0 && <10,000,000)
 * - Validate data types (number)
 * - Validate currency (PLN, EUR, USD, GBP)
 * - Validate confidence score for AI (≥0.8)
 * - Detect suspicious values
 *
 * Reference: Implementation Plan Section 3.6
 */
export class ValidationService {
  private readonly MIN_PRICE = 0;
  private readonly MAX_PRICE = 10_000_000;
  private readonly MIN_CONFIDENCE = 0.8;
  private readonly VALID_CURRENCIES = ["PLN", "EUR", "USD", "GBP"];

  /**
   * Validates a price value
   * @param price - The price to validate
   * @returns ValidationResult with isValid flag and error messages
   */
  validatePrice(price: number): ValidationResult {
    const errors: string[] = [];

    if (typeof price !== "number" || isNaN(price)) {
      errors.push("Price must be a valid number");
    }

    if (price <= this.MIN_PRICE) {
      errors.push(`Price must be greater than ${this.MIN_PRICE}`);
    }

    if (price >= this.MAX_PRICE) {
      errors.push(`Price must be less than ${this.MAX_PRICE}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a currency code
   * @param currency - The currency code to validate
   * @returns True if currency is valid, false otherwise
   */
  validateCurrency(currency: string): boolean {
    return this.VALID_CURRENCIES.includes(currency);
  }

  /**
   * Validates AI confidence score
   * @param score - The confidence score to validate (0-1)
   * @returns True if confidence is >= 0.8, false otherwise
   */
  validateConfidenceScore(score: number): boolean {
    return score >= this.MIN_CONFIDENCE;
  }

  /**
   * Validates complete extracted price data
   * @param data - The extracted price data to validate
   * @returns ValidationResult with isValid flag and error messages
   */
  validateExtractedData(data: ExtractedPrice): ValidationResult {
    const errors: string[] = [];

    // Validate price
    const priceValidation = this.validatePrice(data.price);
    if (!priceValidation.isValid) {
      errors.push(...priceValidation.errors);
    }

    // Validate currency
    if (!this.validateCurrency(data.currency)) {
      errors.push(`Invalid currency: ${data.currency}`);
    }

    // Validate raw value exists
    if (!data.rawValue || data.rawValue.trim().length === 0) {
      errors.push("Raw value is empty");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
