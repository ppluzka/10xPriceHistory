import type { Tables, TablesInsert, Enums } from "./db/database.types";

// ----- Command Models -----

/**
 * Register a new user
 */
export interface RegisterCommand {
  email: string;
  password: string;
  captchaToken: string;
}

/**
 * Log in an existing user
 */
export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Add a new offer subscription
 * url is taken from the DB Insert type for offers
 */
export type AddOfferCommand = Pick<TablesInsert<"offers">, "url">;

/**
 * Update user preferences
 * defaultFrequency comes from the DB Insert type for user_preferences
 */
export interface UpdatePreferencesCommand {
  defaultFrequency: TablesInsert<"user_preferences">["default_frequency"];
}

// ----- DTOs -----

/**
 * Generic pagination wrapper
 */
export interface PaginatedDto<T> {
  data: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * Minimal representation of an offer in list endpoints
 */
export interface OfferDto {
  id: Tables<"offers">["id"];
  title: Tables<"offers">["title"];
  url: Tables<"offers">["url"];
  imageUrl: Tables<"offers">["image_url"];
  city: Tables<"offers">["city"];
  status: Tables<"offers">["status"];
  lastChecked: Tables<"offers">["last_checked"];
  currentPrice: number;
  currency: Enums<"currency">;
  percentChangeFromFirst: number;
  percentChangeFromPrevious: number;
}

/**
 * Response for adding a new offer
 */
export interface AddOfferResponseDto {
  id: Tables<"offers">["id"];
  message: string;
}

/**
 * Detailed representation of a single offer
 */
export interface OfferDetailDto {
  id: Tables<"offers">["id"];
  title: Tables<"offers">["title"];
  url: Tables<"offers">["url"];
  imageUrl: Tables<"offers">["image_url"];
  city: Tables<"offers">["city"];
  status: Tables<"offers">["status"];
  frequency: Tables<"offers">["frequency"];
  createdAt: Tables<"offers">["created_at"];
  lastChecked: Tables<"offers">["last_checked"];
  firstPrice: number;
  lastPrice: number;
  percentChangeFromFirst: number;
  percentChangeFromPrevious: number;
  stats: {
    min: number;
    max: number;
    avg: number;
  };
}

/**
 * Single entry in the price history of an offer
 */
export interface PriceHistoryDto {
  price: Tables<"price_history">["price"];
  currency: Tables<"price_history">["currency"];
  checkedAt: Tables<"price_history">["checked_at"];
}

/**
 * User preferences
 */
export interface PreferencesDto {
  defaultFrequency: Tables<"user_preferences">["default_frequency"];
}

/**
 * Response after updating preferences
 */
export interface UpdatePreferencesResponseDto {
  message: string;
}

/**
 * Summary section of the dashboard
 */
export interface DashboardSummaryDto {
  activeCount: number;
  avgChange: number;
  largestDrop: number;
  largestRise: number;
}

/**
 * Full dashboard response
 */
export interface DashboardDto {
  summary: DashboardSummaryDto;
  offers: OfferDto[];
}

// ----- ViewModels -----

/**
 * Propsy dla komponentu OfferHeader.tsx
 */
export interface OfferHeaderViewModel {
  title: string;
  imageUrl: string | null;
  url: string;
  city: string | null;
  percentChangeFromFirst: number;
  percentChangeFromPrevious: number;
}

/**
 * Propsy dla komponentu OfferStats.tsx
 */
export interface OfferStatsViewModel {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  checkCount: number;
  trend: "wzrostowy" | "spadkowy" | "stabilny";
  observationDurationDays: number;
  currency: string;
}

/**
 * Model danych dla komponentu PriceHistoryChart.tsx
 */
export interface PriceHistoryChartViewModel {
  date: string; // Format "DD.MM" dla osi X
  fullDate: string; // Format "DD.MM.YYYY HH:mm" dla tooltipa
  price: number;
  currency: string;
}

/**
 * Model widoku dla głównego komponentu SettingsView,
 * zarządzający ogólnym stanem ładowania i błędów.
 */
export interface SettingsViewModel {
  isLoading: boolean;
  preferences: PreferencesDto | null;
  error: string | null;
}

/**
 * Model widoku dla formularza zmiany hasła.
 */
export interface PasswordChangeViewModel {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Model widoku dla sekcji usuwania konta.
 */
export interface DeleteAccountViewModel {
  isModalOpen: boolean;
  confirmationInput: string;
  isDeleting: boolean;
}

// ----- OpenRouter Service Types -----

/**
 * Message role types for chat completions
 */
export type ChatMessageRole = "system" | "user" | "assistant";

/**
 * Single chat message
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/**
 * JSON Schema for structured responses
 */
export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  items?: unknown;
  [key: string]: unknown;
}

/**
 * Response format configuration for structured outputs
 */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

/**
 * Parameters for sending chat completion request
 */
export interface SendChatParams {
  messages: ChatMessage[];
  model?: string;
  response_format?: ResponseFormat;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  metadata?: {
    correlationId?: string;
    userId?: string;
    [key: string]: unknown;
  };
}

/**
 * Validated response from the model
 */
export interface ValidatedResponse<T = unknown> {
  data: T;
  raw: string;
  metadata: {
    model: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

/**
 * Model response from OpenRouter
 */
export interface ModelResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

/**
 * OpenRouter service error types
 */
export enum OpenRouterErrorCode {
  AUTH_ERROR = "AUTH_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  RESPONSE_VALIDATION_ERROR = "RESPONSE_VALIDATION_ERROR",
  INVALID_REQUEST_ERROR = "INVALID_REQUEST_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Custom error for OpenRouter service
 */
export interface OpenRouterError {
  code: OpenRouterErrorCode;
  message: string;
  retryable: boolean;
  metadata?: {
    requestId?: string;
    correlationId?: string;
    statusCode?: number;
    retryAfter?: number;
    [key: string]: unknown;
  };
}

// ----- Offer Extraction Types -----

/**
 * Extracted offer data from web scraping
 */
export interface ExtractedOfferData {
  title: string;
  imageUrl: string;
  price: number;
  currency: "PLN" | "EUR" | "USD" | "GBP";
  city: string;
  selector: string;
}

/**
 * Schema for LLM extraction response
 */
export interface LLMExtractionResponse {
  title: string;
  imageUrl: string;
  price: number;
  currency: "PLN" | "EUR" | "USD" | "GBP";
  city: string;
  confidence: number;
  selector: string;
}
