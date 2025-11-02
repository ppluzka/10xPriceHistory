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
    // First, check if active subscription exists
    const { data: subscription, error: selectError } = await this.supabase
      .from("user_offer")
      .select("deleted_at")
      .eq("user_id", userId)
      .eq("offer_id", offerId)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking subscription:", selectError);
      throw new Error(`Failed to check subscription: ${selectError.message}`);
    }

    // If subscription doesn't exist or is already deleted, return false
    if (!subscription || subscription.deleted_at !== null) {
      return false;
    }

    // Perform soft-delete by setting deleted_at timestamp
    const { error: updateError } = await this.supabase
      .from("user_offer")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("offer_id", offerId);

    if (updateError) {
      console.error("Error unsubscribing from offer:", updateError);
      throw new Error(`Failed to unsubscribe: ${updateError.message}`);
    }

    return true;
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
    // Step 1: Check active subscriptions limit (max 5)
    const { count: activeCount, error: countError } = await this.supabase
      .from("user_offer")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (countError) {
      console.error("Error checking active subscriptions:", countError);
      throw new Error(`Failed to check subscription limit: ${countError.message}`);
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

    // Step 3: If offer exists, check user subscription
    if (existingOffer) {
      const offerId = existingOffer.id;

      // Check if user already has this subscription
      const { data: existingSubscription, error: subError } = await this.supabase
        .from("user_offer")
        .select("deleted_at")
        .eq("user_id", userId)
        .eq("offer_id", offerId)
        .maybeSingle();

      if (subError) {
        console.error("Error checking existing subscription:", subError);
        throw new Error(`Failed to check subscription: ${subError.message}`);
      }

      if (existingSubscription) {
        // If active subscription exists, return conflict
        if (existingSubscription.deleted_at === null) {
          throw new Error("Offer already subscribed");
        }

        // If deleted subscription exists, reactivate it
        const { error: reactivateError } = await this.supabase
          .from("user_offer")
          .update({ deleted_at: null })
          .eq("user_id", userId)
          .eq("offer_id", offerId);

        if (reactivateError) {
          console.error("Error reactivating subscription:", reactivateError);
          throw new Error(`Failed to reactivate subscription: ${reactivateError.message}`);
        }

        return {
          id: offerId,
          message: "Offer subscription reactivated",
        };
      }

      // Subscription doesn't exist for this user, but offer exists (assigned to other users)
      // Create new subscription - user will only see price history from this point forward
      // (RLS policies will filter price_history based on user_offer.created_at)
      
      // Validate price change if offer has history (PRD requirement: warn if >50% change)
      await this.validatePriceChange(offerId, url);
      
      const { error: insertSubError } = await this.supabase
        .from("user_offer")
        .insert({ user_id: userId, offer_id: offerId });

      if (insertSubError) {
        console.error("Error creating subscription:", insertSubError);
        throw new Error(`Failed to create subscription: ${insertSubError.message}`);
      }

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
    console.log(`Extracting data from: ${url}`);

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
   * Extract offer data using LLM (OpenRouter)
   * @param html - HTML content of the page
   * @param url - URL of the offer
   * @returns Extracted offer data
   */
  private async extractWithLLM(html: string, url: string): Promise<ExtractedOfferData> {
    if (!this.openRouterService) {
      throw new Error("OpenRouter service not initialized");
    }

    console.log("Using LLM extraction for offer data");

    // Load HTML with cheerio to extract relevant parts and reduce token usage
      const $ = cheerio.load(html);

    // Extract the main content area and meta tags (reduce HTML size)
    const title = $("title").text();
    const metaTags = $("meta")
      .map((_, el) => {
        const property = $(el).attr("property") || $(el).attr("name");
        const content = $(el).attr("content");
        return property && content ? `${property}: ${content}` : "";
      })
      .get()
      .filter(Boolean)
      .join("\n");

    // Get main content area (limit to first 5000 chars to save tokens)
    const mainContent = $("body").text().substring(0, 5000);

    // Build compact HTML representation
    const compactHtml = `
URL: ${url}
Title: ${title}

Meta Tags:
${metaTags}

Main Content:
${mainContent}
`;

    // Define JSON schema for structured extraction
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
              description: "Currency code (PLN for Polish Zloty, EUR for Euro, USD for US Dollar, GBP for British Pound)",
            },
            city: {
              type: "string",
              description: "City/location of the offer (just city name, no extra text)",
            },
            confidence: {
              type: "number",
              description: "Confidence score (0.0 to 1.0) indicating certainty of extracted data. 1.0 = very confident, 0.8-0.9 = confident, <0.8 = uncertain",
            },
            selector: {
              type: "string",
              description: "CSS selector where the price was found (e.g., 'h3[data-testid=\"ad-price\"]', '.offer-price__number')",
            },
          },
          required: ["title", "imageUrl", "price", "currency", "city", "confidence", "selector"],
          additionalProperties: false,
        },
      },
    };

    // Send request to LLM with timeout (PRD requirement: 30 seconds)
    const llmPromise = this.openRouterService.sendChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are a web scraping assistant specialized in extracting structured data from Otomoto.pl (Polish car marketplace) listings.

Extract the following information from the provided HTML content:
- title: Full vehicle title/name
- imageUrl: Main image URL (from og:image meta tag or first photo)
- price: Numeric price value (remove all spaces and currency symbols)
- currency: Currency code (PLN, EUR, USD, or GBP)
- city: City/location name (clean, without extra text)
- confidence: Your confidence score (0.0 to 1.0) about the accuracy of extracted data
  * 1.0 = Very confident, all data clearly visible and unambiguous
  * 0.8-0.9 = Confident, data found with minor ambiguity
  * <0.8 = Uncertain, some data may be incorrect or unclear
- selector: CSS selector or XPath where you found the price (e.g., 'h3[data-testid="ad-price"]', '.offer-price__number', '.price-value')

Be precise and extract only the requested information. If a field cannot be found, use reasonable defaults:
- imageUrl: empty string if not found
- city: "Nieznana" if not found
- confidence: should reflect your certainty about ALL extracted fields`,
        },
        {
          role: "user",
          content: compactHtml,
        },
      ],
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
    if (!extractedData.title) {
      throw new Error("LLM failed to extract title");
    }

    if (extractedData.price <= 0 || extractedData.price > 10000000) {
      throw new Error(`Invalid price value extracted by LLM: ${extractedData.price}`);
    }

    // Check confidence score (PRD requirement: minimum 0.8)
    if (extractedData.confidence < 0.8) {
      console.warn(
        `Low confidence score (${extractedData.confidence.toFixed(2)}) from LLM, falling back to Cheerio extraction`
      );
      return await this.extractWithCheerio(html);
    }

    console.log(
      `LLM extraction successful: ${extractedData.title}, ${extractedData.price} ${extractedData.currency}, ${extractedData.city}`
    );
    console.log(`Confidence: ${extractedData.confidence.toFixed(2)}, Selector: ${extractedData.selector}`);
    console.log(`Tokens used: ${validated.metadata.tokens?.total || "N/A"}`);

    // Log API usage for cost tracking (PRD requirement: US-022)
    await this.logAPIUsage({
      endpoint: "chat/completions",
      model: validated.metadata.model,
      tokens_used: validated.metadata.tokens?.total || 0,
      operation_type: "offer_extraction",
      correlation_id: `extraction-${Date.now()}`,
    });

    return {
      title: extractedData.title,
      imageUrl: extractedData.imageUrl,
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
    console.log("Using Cheerio extraction for offer data");

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

      // Extract image URL
      let imageUrl = $('meta[property="og:image"]').attr("content") || "";
      if (!imageUrl) {
        imageUrl = $('img[data-testid="photo-viewer-image"]').first().attr("src") || "";
      }
      if (!imageUrl) {
        imageUrl = $(".offer-photos img").first().attr("src") || "";
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

      // Extract city/location
      let city = $('a[data-testid="ad-location"]').text().trim();
      if (!city) {
        city = $(".seller-card__links a").first().text().trim();
      }
      if (!city) {
        city = $('p:contains("Lokalizacja")').next().text().trim();
      }
      if (!city) {
        city = $(".breadcrumb li").last().text().trim();
      }
      if (!city) {
      city = "Nieznana";
      }

      // Clean city name (remove extra text)
      city = city.split(",")[0].trim();

    // Determine CSS selector used for price
      let selector = 'h3[data-testid="ad-price"]';
      if (!$('h3[data-testid="ad-price"]').length) {
        selector = ".offer-price__number";
      }

    console.log(`Cheerio extraction successful: ${title}, ${price} ${currency}, ${city}`);

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

      console.log(`API usage logged: ${params.tokens_used} tokens, $${cost.toFixed(6)}`);
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
