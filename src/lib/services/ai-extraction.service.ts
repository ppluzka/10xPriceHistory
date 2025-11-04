import { OpenRouterService } from "../openrouter.service";
import type { AIExtractedPrice } from "../../types";

/**
 * AIExtractionService - AI-powered price extraction fallback
 *
 * Responsibilities:
 * - Integration with OpenRouter.ai (using existing OpenRouterService)
 * - Extract price from HTML when selector fails
 * - Validate confidence score (≥0.8)
 * - Optimize costs through intelligent fallback
 *
 * Reference: Implementation Plan Section 3.2 and 6.2
 */
export class AIExtractionService {
  private openRouterService: OpenRouterService;

  constructor(apiKey: string) {
    this.openRouterService = new OpenRouterService({
      apiKey,
      defaultModel: "openai/gpt-4o-mini", // Fast and cheap
      timeoutMs: 60000,
      maxRetries: 2,
    });
  }

  /**
   * Extracts price only from HTML using AI
   * @param html - The HTML content to extract from
   * @param url - The URL of the offer (for context)
   * @returns Promise resolving to AIExtractedPrice
   * @throws Error if extraction fails or confidence is too low
   */
  async extractPriceOnly(html: string, url: string): Promise<AIExtractedPrice> {
    const systemPrompt = `You are a web scraping expert. Extract ONLY the price and location information from Otomoto.pl offer HTML.
Return a JSON object with:
- price: number (just the number, no currency symbols)
- currency: string (PLN, EUR, USD, or GBP)
- confidence: number (0-1, how confident you are)
- selector: string (CSS selector that can be used to extract this price in the future)
- city: string (city of the offer)
- title: string (title of the offer)
- imageUrl: string (image URL of the offer)
- selector: string (CSS selector that can be used to extract this price in the future)

If you cannot find the price, return confidence: 0.`;

    const userPrompt = `Extract the price from this Otomoto.pl offer page:
URL: ${url}

HTML (truncated to first 50KB):
${html}`;

    const response = await this.openRouterService.sendChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-4o-mini",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "price_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              price: { type: "number" },
              currency: {
                type: "string",
                enum: ["PLN", "EUR", "USD", "GBP"],
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              selector: { type: "string" },
            },
            required: ["price", "currency", "confidence", "selector"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 200,
    });

    // Parse and validate response
    const validated = this.openRouterService.parseAndValidateStructuredResponse<AIExtractedPrice>(response, {
      type: "json_schema",
      json_schema: {
        name: "price_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            price: { type: "number" },
            currency: {
              type: "string",
              enum: ["PLN", "EUR", "USD", "GBP"],
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            selector: { type: "string" },
          },
          required: ["price", "currency", "confidence", "selector"],
          additionalProperties: false,
        },
      },
    });

    return validated.data;
  }

  /**
   * Validates AI extraction confidence score
   * @param extraction - The AI extraction result
   * @returns True if confidence >= 0.8, false otherwise
   */
  validateConfidence(extraction: AIExtractedPrice): boolean {
    return extraction.confidence >= 0.8;
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    await this.openRouterService.close();
  }
}
