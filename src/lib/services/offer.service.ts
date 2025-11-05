import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type {
  AddOfferResponseDto,
  OfferDetailDto,
  OfferDto,
  PaginatedDto,
  PriceHistoryDto,
  ExtractedOfferData,
  LLMExtractionResponse,
  ResponseFormat,
} from "../../types";
import { OpenRouterService } from "../openrouter.service";

/**
 * Service for managing offers and their price history
 */
export class OfferService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private openRouterService?: OpenRouterService
  ) {}

  /**
   * Get paginated list of active offers for a user
   * @param userId - Current authenticated user ID
   * @param page - Page number (1-based)
   * @param size - Number of items per page
   * @param sort - Column to sort by
   * @returns Paginated list of offers with price calculations
   */
  async list(
    userId: string,
    page: number,
    size: number,
    sort: "created_at" | "last_checked" | "title"
  ): Promise<PaginatedDto<OfferDto>> {
    // Calculate range for pagination
    const from = (page - 1) * size;
    const to = page * size - 1;

    // Query offers with user_offer join to ensure RLS and get only active subscriptions
    const {
      data: offers,
      error,
      count,
    } = await this.supabase
      .from("offers")
      .select(
        `
        id,
        title,
        url,
        image_url,
        city,
        status,
        last_checked,
        user_offer!inner(user_id, deleted_at)
      `,
        { count: "exact" }
      )
      .eq("user_offer.user_id", userId)
      .is("user_offer.deleted_at", null)
      .order(sort, { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching offers:", error);
      throw new Error(`Failed to fetch offers: ${error.message}`);
    }

    // If no offers found, return empty result
    if (!offers || offers.length === 0) {
      return {
        data: [],
        page,
        size,
        total: count || 0,
      };
    }

    // Get all offer IDs for batch price history fetch
    const offerIds = offers.map((offer) => offer.id);

    // Fetch all price history in a single query (optimization to avoid N+1)
    const { data: allPriceHistory, error: priceError } = await this.supabase
      .from("price_history")
      .select("offer_id, price, currency, checked_at")
      .in("offer_id", offerIds)
      .order("checked_at", { ascending: true });

    if (priceError) {
      console.error("Error fetching price history:", priceError);
      throw new Error(`Failed to fetch price history: ${priceError.message}`);
    }

    // Group price history by offer_id
    const priceHistoryByOfferId = new Map<number, { price: number; currency: string; checked_at: string }[]>();

    if (allPriceHistory) {
      allPriceHistory.forEach((entry) => {
        const existing = priceHistoryByOfferId.get(entry.offer_id) || [];
        existing.push({
          price: entry.price,
          currency: entry.currency,
          checked_at: entry.checked_at,
        });
        priceHistoryByOfferId.set(entry.offer_id, existing);
      });
    }

    // Map offers to DTOs with their price history
    const offersWithPrices = offers.map((offer) => {
      const priceHistory = priceHistoryByOfferId.get(offer.id) || null;
      return this.mapToOfferDto(offer, priceHistory);
    });

    return {
      data: offersWithPrices,
      page,
      size,
      total: count || 0,
    };
  }

  /**
   * Get detailed information about a specific offer
   * @param userId - Current authenticated user ID
   * @param offerId - ID of the offer to retrieve
   * @returns Offer details with statistics, or null if not found/unauthorized
   */
  async getById(userId: string, offerId: number): Promise<OfferDetailDto | null> {
    // Query offer with user_offer join to ensure authorization
    const { data: offer, error } = await this.supabase
      .from("offers")
      .select(
        `
        id,
        title,
        url,
        image_url,
        city,
        status,
        frequency,
        created_at,
        last_checked,
        user_offer!inner(user_id, deleted_at)
      `
      )
      .eq("id", offerId)
      .eq("user_offer.user_id", userId)
      .is("user_offer.deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("Error fetching offer:", error);
      throw new Error(`Failed to fetch offer: ${error.message}`);
    }

    // If offer not found or user not authorized
    if (!offer) {
      return null;
    }

    // Fetch all price history for this offer
    const { data: priceHistory, error: priceError } = await this.supabase
      .from("price_history")
      .select("price, currency, checked_at")
      .eq("offer_id", offerId)
      .order("checked_at", { ascending: true });

    if (priceError) {
      console.error("Error fetching price history:", priceError);
      throw new Error(`Failed to fetch price history: ${priceError.message}`);
    }

    // Calculate statistics and changes
    if (!priceHistory || priceHistory.length === 0) {
      // No price history available
      return {
        id: offer.id,
        title: offer.title,
        url: offer.url,
        imageUrl: offer.image_url,
        city: offer.city,
        status: offer.status,
        frequency: offer.frequency,
        createdAt: offer.created_at,
        lastChecked: offer.last_checked,
        firstPrice: 0,
        lastPrice: 0,
        percentChangeFromFirst: 0,
        percentChangeFromPrevious: 0,
        stats: {
          min: 0,
          max: 0,
          avg: 0,
        },
      };
    }

    const prices = priceHistory.map((p) => p.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];

    // Calculate percentage changes
    let percentChangeFromFirst = 0;
    if (firstPrice > 0) {
      percentChangeFromFirst = ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    let percentChangeFromPrevious = 0;
    if (prices.length > 1) {
      const previousPrice = prices[prices.length - 2];
      if (previousPrice > 0) {
        percentChangeFromPrevious = ((lastPrice - previousPrice) / previousPrice) * 100;
      }
    }

    // Calculate statistics
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sum = prices.reduce((acc, price) => acc + price, 0);
    const avg = sum / prices.length;

    return {
      id: offer.id,
      title: offer.title,
      url: offer.url,
      imageUrl: offer.image_url,
      city: offer.city,
      status: offer.status,
      frequency: offer.frequency,
      createdAt: offer.created_at,
      lastChecked: offer.last_checked,
      firstPrice,
      lastPrice,
      percentChangeFromFirst: Number(percentChangeFromFirst.toFixed(2)),
      percentChangeFromPrevious: Number(percentChangeFromPrevious.toFixed(2)),
      stats: {
        min,
        max,
        avg: Number(avg.toFixed(2)),
      },
    };
  }

  /**
   * Unsubscribe user from an offer (soft-delete)
   * @param userId - Current authenticated user ID
   * @param offerId - ID of the offer to unsubscribe from
   * @returns true if unsubscribed successfully, false if not found or already unsubscribed
   */
  async unsubscribe(userId: string, offerId: number): Promise<boolean> {
    // Verify the Supabase client has a valid session
    // This ensures auth.uid() will work correctly in the database function
    const {
      data: { user },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError || !user) {
      console.error("Error getting authenticated user:", authError);
      throw new Error("Authentication required");
    }

    // Verify the userId matches the authenticated user
    if (user.id !== userId) {
      throw new Error("User ID mismatch");
    }

    // Use the database function to handle soft-delete
    // This function uses SECURITY DEFINER to bypass RLS but verifies auth.uid() internally
    // This is necessary because RLS with check clauses can fail on UPDATE operations
    const { data, error } = await this.supabase.rpc("soft_delete_user_offer", {
      p_offer_id: offerId,
    });

    if (error) {
      console.error("Error unsubscribing from offer:", error);
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }

    // The function returns true if the subscription was soft-deleted, false if not found
    return data === true;
  }

  /**
   * Get paginated price history for a specific offer
   * @param userId - Current authenticated user ID
   * @param offerId - ID of the offer
   * @param page - Page number (1-based)
   * @param size - Number of items per page
   * @returns Paginated list of price history entries, or null if not authorized
   */
  async getHistory(
    userId: string,
    offerId: number,
    page: number,
    size: number
  ): Promise<PaginatedDto<PriceHistoryDto> | null> {
    // First, verify user is subscribed to this offer (authorization check)
    const { data: subscription, error: authError } = await this.supabase
      .from("user_offer")
      .select("deleted_at")
      .eq("user_id", userId)
      .eq("offer_id", offerId)
      .maybeSingle();

    if (authError) {
      console.error("Error checking subscription:", authError);
      throw new Error(`Failed to check subscription: ${authError.message}`);
    }

    // If subscription doesn't exist or is deleted, return null (not authorized)
    if (!subscription || subscription.deleted_at !== null) {
      return null;
    }

    // Calculate range for pagination
    const from = (page - 1) * size;
    const to = page * size - 1;

    // Fetch paginated price history
    const {
      data: priceHistory,
      error: historyError,
      count,
    } = await this.supabase
      .from("price_history")
      .select("price, currency, checked_at", { count: "exact" })
      .eq("offer_id", offerId)
      .order("checked_at", { ascending: false }) // Newest first
      .range(from, to);

    if (historyError) {
      console.error("Error fetching price history:", historyError);
      throw new Error(`Failed to fetch price history: ${historyError.message}`);
    }

    // Map to PriceHistoryDto
    const data: PriceHistoryDto[] = (priceHistory || []).map((entry) => ({
      price: entry.price,
      currency: entry.currency,
      checkedAt: entry.checked_at,
    }));

    return {
      data,
      page,
      size,
      total: count || 0,
    };
  }

  /**
   * Maps database offer and price history to OfferDto
   */
  private mapToOfferDto(
    offer: {
      id: number;
      title: string;
      url: string;
      image_url: string | null;
      city: string;
      status: "active" | "removed" | "error";
      last_checked: string | null;
    },
    priceHistory: { price: number; currency: string; checked_at: string }[] | null
  ): OfferDto {
    // Default values when no price history exists
    let currentPrice = 0;
    let currency: "PLN" | "EUR" | "USD" = "PLN";
    let percentChangeFromFirst = 0;
    let percentChangeFromPrevious = 0;

    if (priceHistory && priceHistory.length > 0) {
      const firstPrice = priceHistory[0].price;
      const lastPrice = priceHistory[priceHistory.length - 1].price;

      currentPrice = lastPrice;
      currency = priceHistory[priceHistory.length - 1].currency as "PLN" | "EUR" | "USD";

      // Calculate percentage change from first price
      if (firstPrice > 0) {
        percentChangeFromFirst = ((lastPrice - firstPrice) / firstPrice) * 100;
      }

      // Calculate percentage change from previous price
      if (priceHistory.length > 1) {
        const previousPrice = priceHistory[priceHistory.length - 2].price;
        if (previousPrice > 0) {
          percentChangeFromPrevious = ((lastPrice - previousPrice) / previousPrice) * 100;
        }
      }
    }

    return {
      id: offer.id,
      title: offer.title,
      url: offer.url,
      imageUrl: offer.image_url || "",
      city: offer.city,
      status: offer.status,
      lastChecked: offer.last_checked || "",
      currentPrice,
      currency,
      percentChangeFromFirst: Number(percentChangeFromFirst.toFixed(2)),
      percentChangeFromPrevious: Number(percentChangeFromPrevious.toFixed(2)),
    };
  }

  /**
   * Add a new offer subscription for a user
   * @param userId - Current authenticated user ID
   * @param url - URL of the Otomoto.pl offer
   * @returns Response with offer ID and message
   * @throws Error if rate limit exceeded, already subscribed, or extraction fails
   */
  async add(userId: string, url: string): Promise<AddOfferResponseDto> {
    // Verify Supabase client has authentication context
    const {
      data: { user: authUser },
      error: authError,
    } = await this.supabase.auth.getUser();

    if (authError || !authUser) {
      console.error("Authentication error in OfferService.add:", authError);
      throw new Error(`Authentication required: ${authError?.message || "No user session"}`);
    }

    // Verify userId matches authenticated user (RLS will enforce this too)
    if (authUser.id !== userId) {
      console.error("User ID mismatch:", { provided: userId, authenticated: authUser.id });
      throw new Error("User ID does not match authenticated user");
    }

    // Step 1: Check active subscriptions limit (max 5)
    // RLS policy already filters by auth.uid() = user_id, so we can omit the .eq() filter
    // However, we keep it for clarity and to ensure we're querying the right user
    const { count: activeCount, error: countError } = await this.supabase
      .from("user_offer")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (countError) {
      console.error("Error checking active subscriptions:", {
        error: countError,
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        userId,
        authUserId: authUser.id,
      });

      // Provide more detailed error message
      const errorMessage = countError.message || countError.details || countError.hint || "Unknown error";
      const errorCode = countError.code || "UNKNOWN_ERROR";
      throw new Error(`Failed to check subscription limit (${errorCode}): ${errorMessage}`);
    }

    if (activeCount !== null && activeCount >= 5) {
      throw new Error("Rate limit exceeded: maximum 5 active subscriptions allowed");
    }

    // Step 2: Check if offer already exists
    const { data: existingOffer, error: offerError } = await this.supabase
      .from("offers")
      .select("id")
      .eq("url", url)
      .maybeSingle();

    if (offerError) {
      console.error("Error checking existing offer:", offerError);
      throw new Error(`Failed to check existing offer: ${offerError.message}`);
    }

    // Step 3: If offer exists, handle user subscription using database function
    // This function bypasses RLS to check for soft-deleted subscriptions and handles reactivation
    if (existingOffer) {
      const offerId = existingOffer.id;

      // Validate price change if offer has history (PRD requirement: warn if >50% change)
      await this.validatePriceChange(offerId, url);

      // Use database function to handle subscription creation/reactivation
      // This bypasses RLS to properly handle soft-deleted subscriptions
      const { data: result, error: upsertError } = await this.supabase.rpc("upsert_user_offer", {
        p_offer_id: offerId,
      });

      if (upsertError) {
        console.error("Error upserting subscription:", upsertError);
        throw new Error(`Failed to create subscription: ${upsertError.message}`);
      }

      // Handle function return values
      if (result === "exists") {
        throw new Error("Offer already subscribed");
      }

      if (result === "reactivated") {
        return {
          id: offerId,
          message: "Offer subscription reactivated",
        };
      }

      // result === "created"
      return {
        id: offerId,
        message: "Offer added",
      };
    }

    // Step 4: Offer doesn't exist, extract data and create new offer
    // For now, we'll use mock data - actual scraping will be implemented later
    const extractedData = await this.extractOfferData(url);

    // Step 5: Insert new offer
    const { data: newOffer, error: insertOfferError } = await this.supabase
      .from("offers")
      .insert({
        url,
        title: extractedData.title,
        image_url: extractedData.imageUrl,
        selector: extractedData.selector,
        city: extractedData.city,
        status: "active",
        frequency: "24h",
        last_checked: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertOfferError || !newOffer) {
      console.error("Error inserting offer:", insertOfferError);
      throw new Error(`Failed to create offer: ${insertOfferError?.message || "Unknown error"}`);
    }

    const offerId = newOffer.id;

    // Step 6: Create user subscription (trigger will check 10/24h limit)
    const { error: insertSubError } = await this.supabase
      .from("user_offer")
      .insert({ user_id: userId, offer_id: offerId });

    if (insertSubError) {
      console.error("Error creating subscription:", insertSubError);
      // Clean up the offer if subscription creation fails
      await this.supabase.from("offers").delete().eq("id", offerId);
      throw new Error(`Failed to create subscription: ${insertSubError.message}`);
    }

    // Step 7: Insert initial price history
    const { error: insertPriceError } = await this.supabase.from("price_history").insert({
      offer_id: offerId,
      price: extractedData.price,
      currency: extractedData.currency,
      checked_at: new Date().toISOString(),
    });

    if (insertPriceError) {
      console.error("Error inserting price history:", insertPriceError);
      // Don't fail the entire operation, just log the error
      // The price can be added later during the next check
    }

    return {
      id: offerId,
      message: "Offer added",
    };
  }

  /**
   * Extract offer data from Otomoto.pl URL using LLM
   * @param url - URL of the offer
   * @returns Extracted offer data
   * @throws Error if extraction fails
   */
  private async extractOfferData(url: string): Promise<ExtractedOfferData> {
    try {
      // Step 1: Fetch HTML with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch page: HTTP ${response.status}`);
      }

      const html = await response.text();

      // Step 2: If OpenRouter service is available, use LLM extraction
      if (this.openRouterService) {
        return await this.extractWithLLM(html, url);
      }

      // Step 3: Fallback to traditional cheerio extraction if LLM is not available
      return await this.extractWithCheerio(html);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Failed to fetch page: request timeout (10s)");
        }
        console.error("Error extracting offer data:", error);
        throw new Error(`Data extraction failed: ${error.message}`);
      }
      throw new Error("Data extraction failed: unknown error");
    }
  }

  /**
   * Extract location context from HTML for LLM processing
   * @param $ - Cheerio instance with loaded HTML
   * @returns Object with locationInfo and uniqueLocationContext
   */
  private extractLocationContextForLLM($: cheerio.CheerioAPI): {
    locationInfo: string;
    uniqueLocationContext: string[];
  } {
    // Extract location-specific elements to improve city extraction
    // First, try standard selectors
    let locationInfo = "";
    const locationSelectors = [
      'a[data-testid="ad-location"]',
      '[data-testid*="location"]',
      '[data-testid*="address"]',
      ".seller-card__links a",
      'p:contains("Lokalizacja")',
      'span:contains("Lokalizacja")',
      ".breadcrumb li",
      '[class*="location"]',
      '[class*="address"]',
    ];

    for (const selector of locationSelectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          locationInfo = element.text().trim();
          if (locationInfo && locationInfo.length > 2) {
            break;
          }
        }
      } catch {
        // Skip invalid selectors
      }
    }

    // Enhanced location context extraction (text near SVG icons and location elements)
    const locationContext: string[] = [];

    // Find all SVG elements that might be location icons - check multiple levels
    $("svg").each((_, el) => {
      const $svg = $(el);

      // Check parent, grandparent, and great-grandparent for location text
      const $parent = $svg.parent();
      const $gparent = $parent.parent();
      const $ggparent = $gparent.parent();

      // Get text from multiple levels
      const parentText = $parent.text().trim();
      const gparentText = $gparent.text().trim();
      const ggparentText = $ggparent.text().trim();

      // Check if any contain location-like patterns
      const allTexts = [parentText, gparentText, ggparentText];
      for (const text of allTexts) {
        if (text && text.length > 2) {
          // Check if it looks like a location (contains postal code, street, city patterns)
          if (
            text.match(
              /\d{2}-\d{3}|ul\.|ulica|gmina|powiat|województwo|Białuń|Marki|goleniowski|wołomiński|Zachodniopomorskie|Mazowieckie/i
            )
          ) {
            locationContext.push(`Context near SVG icon: ${text}`);
            break; // Found good match, move to next SVG
          }
        }
      }
    });

    // Look for common location-related patterns with more aggressive search
    const locationPatternSelectors = [
      'a[href*="lokalizacja"]',
      'a[href*="address"]',
      '[data-testid*="location"]',
      '[data-testid*="address"]',
      '[class*="location"]',
      '[class*="address"]',
      '[aria-label*="lokalizacja"]',
      '[aria-label*="location"]',
      '[title*="lokalizacja"]',
      '[title*="location"]',
    ];

    locationPatternSelectors.forEach((selector) => {
      try {
        $(selector).each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 2) {
            locationContext.push(`Location element (${selector}): ${text}`);
          }
        });
      } catch {
        // Skip invalid selectors
      }
    });

    // Look for text near map containers with more levels
    $('[class*="map"], [id*="map"], [class*="google-map"], [class*="Map"]').each((_, el) => {
      const $el = $(el);
      const $parent = $el.parent();
      const $gparent = $parent.parent();

      const parentText = $parent.text().trim();
      const gparentText = $gparent.text().trim();

      for (const text of [parentText, gparentText]) {
        if (text && text.length > 2) {
          locationContext.push(`Near map container: ${text}`);
          break;
        }
      }
    });

    // Look for specific sections that might contain location (more targeted approach)
    const locationSections = [
      '[data-testid*="seller"]',
      '[class*="seller"]',
      '[class*="contact"]',
      '[class*="info"]',
      '[id*="location"]',
      '[id*="address"]',
    ];

    locationSections.forEach((sectionSelector) => {
      try {
        $(sectionSelector).each((_, el) => {
          const $section = $(el);
          const text = $section.text().trim();
          if (text && text.length > 10) {
            // Check if it contains location patterns
            if (text.match(/\d{2}-\d{3}|ul\.|ulica|gmina|powiat|województwo|Białuń|Marki/i)) {
              // Extract just the location part (more focused)
              const lines = text
                .split("\n")
                .filter(
                  (line) => line.trim().length > 5 && line.match(/\d{2}-\d{3}|ul\.|ulica|gmina|powiat|województwo/i)
                );
              if (lines.length > 0) {
                const locationText = lines.join(", ");
                if (!locationContext.some((ctx) => ctx.includes(locationText))) {
                  locationContext.push(`Location in ${sectionSelector}: ${locationText}`);
                }
              }
            }
          }
        });
      } catch {
        // Skip invalid selectors
      }
    });

    // Remove duplicates (no limit on count)
    const uniqueLocationContext = Array.from(new Set(locationContext));

    return {
      locationInfo,
      uniqueLocationContext,
    };
  }

  /**
   * Build LLM extraction prompt and response format
   * @param url - URL of the offer
   * @param title - Page title
   * @param mainContent - Main content text from body
   * @returns Object with messages and responseFormat
   */
  private buildLLMExtractionPrompt(
    url: string,
    title: string,
    mainContent: string
  ): {
    messages: { role: "system" | "user"; content: string }[];
    responseFormat: ResponseFormat;
  } {
    const compactHtml = `
URL: ${url}
Title: ${title}

Main Content (text only):
${mainContent}
`;

    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: "offer_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Full title of the vehicle offer",
            },
            imageUrl: {
              type: "string",
              description: "URL of the main image (from og:image or first photo)",
            },
            price: {
              type: "number",
              description: "Price as a number (without currency symbols or spaces)",
            },
            currency: {
              type: "string",
              enum: ["PLN", "EUR", "USD", "GBP"],
              description:
                "Currency code (PLN for Polish Zloty, EUR for Euro, USD for US Dollar, GBP for British Pound)",
            },
            city: {
              type: "string",
              description:
                "Full location/address of the offer. Extract the complete location information including street address, postal code, city, county, and voivodeship if available. Examples: 'ul. Wiśniowa 15 - 72-100 Białuń, goleniowski, Zachodniopomorskie (Polska)', 'Marki, wołomiński, Mazowieckie'. If only city name is available, use that. This is CRITICAL to find - check Location Context section first.",
            },
            confidence: {
              type: "number",
              description:
                "Confidence score (0.0 to 1.0) indicating certainty of extracted data. 1.0 = very confident, 0.8-0.9 = confident, <0.8 = uncertain",
            },
            selector: {
              type: "string",
              description:
                "CSS selector where the price was found (e.g., 'h3[data-testid=\"ad-price\"]', '.offer-price__number')",
            },
          },
          required: ["title", "imageUrl", "price", "currency", "city", "confidence", "selector"],
          additionalProperties: false,
        },
      },
    };

    return {
      messages: [
        {
          role: "system",
          content: `You are a web scraping assistant specialized in extracting structured data from Otomoto.pl (Polish car marketplace) listings.

Extract the following information from the provided HTML content:
- title: Full vehicle title/name
- imageUrl: Main image URL (from og:image meta tag or first photo)
- price: Numeric price value (remove all spaces and currency symbols)
- currency: Currency code (PLN, EUR, USD, or GBP) - THIS IS THE MOST CRITICAL FIELD TO EXTRACT
- city: FULL location/address of the offer 
  * **SEARCH ORDER (follow this exactly):**
    Search "Main Content" text carefully - look for patterns like:
       - Postal codes: "72-100", "00-000" format
       - Street addresses: "ul.", "ulica", street names
       - City names followed by county and voivodeship
       - Patterns like "City, county, Voivodeship" or "Street - Postal Code City, county, Voivodeship"
  
  * **WHAT TO EXTRACT:**
    Extract the COMPLETE location information if available:
    - Street address (e.g., "ul. Wiśniowa 15")
    - Postal code and city (e.g., "72-100 Białuń")
    - County (e.g., "goleniowski", "wołomiński")
    - Voivodeship (e.g., "Zachodniopomorskie", "Mazowieckie")
    - Country if mentioned (e.g., "(Polska)")
  
  * **EXAMPLES OF CORRECT OUTPUT:**
    - "ul. Wiśniowa 15 - 72-100 Białuń, goleniowski, Zachodniopomorskie (Polska)"
    - "Marki, wołomiński, Mazowieckie"
    - "Warszawa, mazowieckie"
    - "Kraków, małopolskie"
  
  * **IF PARTIAL INFO AVAILABLE:**
    - If you find city + county + voivodeship: combine them (e.g., "Marki, wołomiński, Mazowieckie")
    - If you find full address with postal code: include everything (e.g., "ul. Wiśniowa 15 - 72-100 Białuń, goleniowski, Zachodniopomorskie")
    - If only city name: use that (e.g., "Warszawa")
    - ONLY use "Nieznana" if you absolutely cannot find ANY location information after searching ALL sections
  
  * **IMPORTANT:**
    - Location information may be split across multiple elements in HTML
    - Look for patterns: postal codes (XX-XXX), street names, city names, administrative divisions
    - Polish location names use special characters: ą, ć, ę, ł, ń, ó, ś, ź, ż
    - Be thorough - search the entire provided content before giving up
- confidence: Your confidence score (0.0 to 1.0) about the accuracy of extracted data
  * 1.0 = Very confident, all data clearly visible and unambiguous
  * 0.8-0.9 = Confident, data found with minor ambiguity
  * <0.8 = Uncertain, some data may be incorrect or unclear
- selector: CSS selector or XPath where you found the price (e.g., 'h3[data-testid="ad-price"]', '.offer-price__number', '.price-value')

Be precise and extract only the requested information. If a field cannot be found, use reasonable defaults:
- imageUrl: empty string if not found
- city: "Nieznana" if not found (only use this as last resort after checking all Location Context)
- confidence: should reflect your certainty about ALL extracted fields`,
        },
        {
          role: "user",
          content: compactHtml,
        },
      ],
      responseFormat,
    };
  }

  /**
   * Validate LLM extraction response
   * @param extractedData - Data extracted by LLM
   * @throws Error if validation fails
   */
  private validateLLMResponse(extractedData: LLMExtractionResponse): void {
    if (!extractedData.title) {
      throw new Error("LLM failed to extract title");
    }

    if (extractedData.price <= 0 || extractedData.price > 10000000) {
      throw new Error(`Invalid price value extracted by LLM: ${extractedData.price}`);
    }
  }

  /**
   * Extract offer data using LLM (OpenRouter)
   * @param html - HTML content of the page
   * @param url - URL of the offer
   * @returns Extracted offer data
   */
  private async extractWithLLM(html: string, url: string): Promise<ExtractedOfferData> {
    if (!this.openRouterService) {
      throw new Error("OpenRouter service not initialized");
    }

    // Load HTML with cheerio to extract relevant parts and reduce token usage
    const $ = cheerio.load(html);

    // Extract the main content area
    const title = $("title").text();

    // Extract location context for LLM (for logging/debugging)
    this.extractLocationContextForLLM($);

    // Extract main image URL before removing CSS/JS (use same fallbacks as extractWithCheerio)
    let mainImageUrl = "";

    // Try og:image meta tag first (most reliable)
    mainImageUrl = $('meta[property="og:image"]').attr("content") || "";

    // Fallback to photo viewer image
    if (!mainImageUrl) {
      const $photoViewer = $('img[data-testid="photo-viewer-image"]').first();
      if ($photoViewer.length) {
        mainImageUrl =
          $photoViewer.attr("src") || $photoViewer.attr("data-src") || $photoViewer.attr("data-lazy-src") || "";
      }
    }

    // Fallback to offer photos gallery
    if (!mainImageUrl) {
      const $offerPhoto = $(".offer-photos img").first();
      if ($offerPhoto.length) {
        mainImageUrl =
          $offerPhoto.attr("src") || $offerPhoto.attr("data-src") || $offerPhoto.attr("data-lazy-src") || "";
      }
    }

    // Last resort: first image in the page (but exclude common logo/icon patterns)
    if (!mainImageUrl) {
      $("img").each((_, el) => {
        const $img = $(el);
        const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src") || "";
        // Skip common logo/icon patterns
        if (src && !src.match(/(logo|icon|favicon|sprite|banner|advertisement)/i)) {
          mainImageUrl = src;
          return false; // break
        }
      });
    }

    // Remove all CSS and JS to reduce token usage and noise
    $("script").remove();
    $("style").remove();
    // Remove inline CSS from all elements
    $("*").removeAttr("style");
    // Remove inline JavaScript event handlers (onclick, onload, etc.)
    const inlineJsAttrs = [
      "onclick",
      "onload",
      "onerror",
      "onmouseover",
      "onmouseout",
      "onfocus",
      "onblur",
      "onsubmit",
      "onchange",
      "onkeydown",
      "onkeyup",
      "onkeypress",
      "onselect",
      "oninput",
      "onreset",
      "ondblclick",
      "onmousedown",
      "onmouseup",
      "onmousemove",
      "oncontextmenu",
      "ondrag",
      "ondragend",
      "ondragenter",
      "ondragleave",
      "ondragover",
      "ondragstart",
      "ondrop",
      "onscroll",
      "onwheel",
    ];
    inlineJsAttrs.forEach((attr) => {
      $("*").removeAttr(attr);
    });

    // Remove class and id attributes (CSS classes) to reduce noise
    $("*").removeAttr("class");
    $("*").removeAttr("id");

    let mainContent = $("body").text();

    // Remove CSS fragments from text (e.g., .ooa-106z5u6{display:-webkit-box;...})
    // Function to remove CSS blocks by finding matching braces
    const removeCSSBlocks = (text: string): string => {
      let result = text;
      let changed = true;

      // Iteratively remove CSS blocks until no more changes
      while (changed) {
        const before = result;
        // Remove CSS class definitions starting with .className{
        result = result.replace(/\.\w+[-\w]*\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");
        // Remove @media queries
        result = result.replace(/@media[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");
        // Remove standalone blocks with CSS properties
        result = result.replace(
          /\{[^{}]*(?:display|position|margin|padding|width|height|color|background|border|z-index|flex|align|justify|gap|webkit|ms-)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
          ""
        );
        changed = before !== result;
      }
      return result;
    };

    mainContent = removeCSSBlocks(mainContent);
    // Clean up multiple spaces and newlines
    mainContent = mainContent.replace(/\s+/g, " ").trim();

    // Append main image URL to content if found
    const contentWithMainImage = mainImageUrl ? `${mainContent}\n\nMain image URL: ${mainImageUrl}` : mainContent;

    // Build LLM prompt and response format
    const { messages, responseFormat } = this.buildLLMExtractionPrompt(url, title, contentWithMainImage);

    // Send request to LLM with timeout (PRD requirement: 30 seconds)
    const llmPromise = this.openRouterService.sendChatCompletion({
      messages,
      response_format: responseFormat,
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 500,
    });

    // Create timeout promise (PRD: 30 seconds timeout for LLM request)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM request timeout (30s)")), 30000)
    );

    let llmResponse;
    try {
      llmResponse = await Promise.race([llmPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        console.warn("LLM request timeout, falling back to Cheerio extraction");
        return await this.extractWithCheerio(html);
      }
      throw error;
    }

    // Parse and validate response
    const validated = this.openRouterService.parseAndValidateStructuredResponse<LLMExtractionResponse>(
      llmResponse,
      responseFormat
    );

    const extractedData = validated.data;

    // Validate extracted data
    this.validateLLMResponse(extractedData);

    // Check confidence score (PRD requirement: minimum 0.8)
    if (extractedData.confidence < 0.8) {
      console.warn(
        `Low confidence score (${extractedData.confidence.toFixed(2)}) from LLM, falling back to Cheerio extraction`
      );
      return await this.extractWithCheerio(html);
    }

    // Log API usage for cost tracking (PRD requirement: US-022)
    await this.logAPIUsage({
      endpoint: "chat/completions",
      model: validated.metadata.model,
      tokens_used: validated.metadata.tokens?.total || 0,
      operation_type: "offer_extraction",
      correlation_id: `extraction-${Date.now()}`,
    });

    // Use extracted mainImageUrl as fallback if LLM returned empty imageUrl
    const finalImageUrl = extractedData.imageUrl || mainImageUrl || "";

    if (!finalImageUrl) {
      console.warn("⚠️  WARNING: No image URL extracted from offer");
    }

    return {
      title: extractedData.title,
      imageUrl: finalImageUrl,
      price: extractedData.price,
      currency: extractedData.currency,
      city: extractedData.city,
      selector: extractedData.selector || 'h3[data-testid="ad-price"]', // fallback if empty
    };
  }

  /**
   * Extract offer data using Cheerio (fallback method)
   * @param html - HTML content of the page
   * @returns Extracted offer data
   */
  private async extractWithCheerio(html: string): Promise<ExtractedOfferData> {
    const $ = cheerio.load(html);

    // Extract title
    let title = $('h1[data-testid="ad-title"]').text().trim();
    if (!title) {
      title = $("h1.offer-title").text().trim();
    }
    if (!title) {
      title = $('meta[property="og:title"]').attr("content")?.trim() || "";
    }
    if (!title) {
      throw new Error("Failed to extract title from page");
    }

    // Extract image URL (with multiple fallbacks and lazy loading support)
    let imageUrl = $('meta[property="og:image"]').attr("content") || "";

    if (!imageUrl) {
      const $photoViewer = $('img[data-testid="photo-viewer-image"]').first();
      if ($photoViewer.length) {
        imageUrl =
          $photoViewer.attr("src") || $photoViewer.attr("data-src") || $photoViewer.attr("data-lazy-src") || "";
      }
    }

    if (!imageUrl) {
      const $offerPhoto = $(".offer-photos img").first();
      if ($offerPhoto.length) {
        imageUrl = $offerPhoto.attr("src") || $offerPhoto.attr("data-src") || $offerPhoto.attr("data-lazy-src") || "";
      }
    }

    // Last resort: first image in the page (but exclude common logo/icon patterns)
    if (!imageUrl) {
      $("img").each((_, el) => {
        const $img = $(el);
        const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src") || "";
        // Skip common logo/icon patterns
        if (src && !src.match(/(logo|icon|favicon|sprite|banner|advertisement)/i)) {
          imageUrl = src;
          return false; // break
        }
      });
    }

    // Extract price
    let priceText = $('h3[data-testid="ad-price"]').text().trim();
    if (!priceText) {
      priceText = $(".offer-price__number").text().trim();
    }
    if (!priceText) {
      priceText = $('span[class*="price"]').first().text().trim();
    }

    // Parse price number (remove spaces, PLN, etc.)
    const priceMatch = priceText.replace(/\s/g, "").match(/(\d+)/);
    if (!priceMatch) {
      throw new Error(`Failed to extract price from: "${priceText}"`);
    }
    const price = parseInt(priceMatch[1], 10);

    if (price <= 0 || price > 10000000) {
      throw new Error(`Invalid price value: ${price}`);
    }

    // Extract currency (default to PLN for otomoto.pl)
    let currency: "PLN" | "EUR" | "USD" | "GBP" = "PLN";
    if (priceText.includes("EUR") || priceText.includes("€")) {
      currency = "EUR";
    } else if (priceText.includes("USD") || priceText.includes("$")) {
      currency = "USD";
    } else if (priceText.includes("GBP") || priceText.includes("£")) {
      currency = "GBP";
    }

    // Extract city/location (full address if available)
    let city = $('a[data-testid="ad-location"]').text().trim();
    if (!city) {
      city = $(".seller-card__links a").first().text().trim();
    }
    if (!city) {
      city = $('p:contains("Lokalizacja")').next().text().trim();
    }
    if (!city) {
      // Try to find location near SVG icons (common pattern on Otomoto)
      $("svg").each((_, el) => {
        const $svg = $(el);
        const $container = $svg.parent().parent();
        const text = $container.text().trim();
        if (text && text.length < 300 && text.length > 2 && !city) {
          // Check if text contains location-like patterns (street, postal code, city)
          if (text.match(/\d{2}-\d{3}|ul\.|ulica|gmina|powiat|województwo/i)) {
            city = text;
          }
        }
      });
    }
    if (!city) {
      city = $(".breadcrumb li").last().text().trim();
    }
    if (!city) {
      city = "Nieznana";
    }

    // Keep full location (don't truncate after comma)

    // Determine CSS selector used for price
    let selector = 'h3[data-testid="ad-price"]';
    if (!$('h3[data-testid="ad-price"]').length) {
      selector = ".offer-price__number";
    }

    return {
      title,
      imageUrl,
      price,
      currency,
      city,
      selector,
    };
  }

  /**
   * Validate price change for existing offer (PRD requirement: warn if >50% change)
   * @param offerId - ID of the offer to check
   * @param url - URL to fetch current price
   */
  private async validatePriceChange(offerId: number, url: string): Promise<void> {
    try {
      // Get last price from history
      const { data: lastPriceEntry, error: priceError } = await this.supabase
        .from("price_history")
        .select("price")
        .eq("offer_id", offerId)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceError) {
        console.error("Error fetching last price for validation:", priceError);
        return; // Don't block operation on validation error
      }

      // If no history, nothing to validate
      if (!lastPriceEntry || !lastPriceEntry.price) {
        return;
      }

      // Fetch current price
      const currentData = await this.extractOfferData(url);

      // Calculate price change percentage
      const priceChange = Math.abs((currentData.price - lastPriceEntry.price) / lastPriceEntry.price) * 100;

      // PRD requirement: warn if >50% change
      if (priceChange > 50) {
        console.warn(
          `⚠️  WARNING: Price changed by ${priceChange.toFixed(1)}% for offer ${offerId}. ` +
            `Previous: ${lastPriceEntry.price}, Current: ${currentData.price}`
        );
        // Log to monitoring system (can be extended to save to database)
      }
    } catch (error) {
      // Don't throw error - validation is informational only (PRD: "Warning nie blokuje zapisu")
      console.error("Error during price change validation:", error);
    }
  }

  /**
   * Log API usage to database for cost tracking (PRD requirement: US-022)
   * @param params API usage parameters
   */
  private async logAPIUsage(params: {
    endpoint: string;
    model: string;
    tokens_used: number;
    operation_type: string;
    correlation_id: string;
    user_id?: string;
  }): Promise<void> {
    try {
      const cost = this.calculateAPICost(params.tokens_used, params.model);

      await this.supabase.from("api_usage").insert({
        endpoint: params.endpoint,
        model: params.model,
        tokens_used: params.tokens_used,
        cost_usd: cost,
        user_id: params.user_id || null,
        correlation_id: params.correlation_id,
        operation_type: params.operation_type,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Don't throw error - logging failure shouldn't block operations
      console.error("Error logging API usage:", error);
    }
  }

  /**
   * Calculate estimated cost for OpenRouter API usage
   * Based on model pricing (approximate rates as of 2025)
   * @param tokens Total tokens used
   * @param model Model name
   * @returns Estimated cost in USD
   */
  private calculateAPICost(tokens: number, model: string): number {
    // Pricing per 1M tokens (approximate rates)
    const pricing: Record<string, { input: number; output: number }> = {
      "gpt-4o-mini": { input: 0.15, output: 0.6 }, // $0.15/$0.60 per 1M tokens
      "gpt-4o": { input: 5.0, output: 15.0 },
      "claude-3-haiku": { input: 0.25, output: 1.25 },
      "claude-3-sonnet": { input: 3.0, output: 15.0 },
    };

    // Find matching pricing (default to gpt-4o-mini if not found)
    let rates = pricing["gpt-4o-mini"];
    for (const [key, value] of Object.entries(pricing)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        rates = value;
        break;
      }
    }

    // Assume 70% input, 30% output tokens (typical for extraction tasks)
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;

    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1000000;

    return cost;
  }
}
