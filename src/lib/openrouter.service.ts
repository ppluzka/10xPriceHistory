import Ajv, { type ValidateFunction } from "ajv";
import pRetry from "p-retry";
import pLimit from "p-limit";
import type {
  SendChatParams,
  ModelResponse,
  ResponseFormat,
  ValidatedResponse,
  OpenRouterError,
  OpenRouterErrorCode,
  JsonSchema,
} from "../types";

/**
 * Logger interface for dependency injection
 */
export interface LoggerInterface {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Rate limiter interface for dependency injection
 */
export interface RateLimiterInterface {
  acquire(key: string): Promise<void>;
}

/**
 * Configuration options for OpenRouterService
 */
export interface OpenRouterServiceOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  rateLimiter?: RateLimiterInterface;
  logger?: LoggerInterface;
}

/**
 * Default console logger implementation
 */
class ConsoleLogger implements LoggerInterface {
  info(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, meta || "");
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || "");
  }
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, meta || "");
  }
  debug(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(`[DEBUG] ${message}`, meta || "");
  }
}

/**
 * Default in-memory rate limiter implementation
 */
class InMemoryRateLimiter implements RateLimiterInterface {
  private limiter: ReturnType<typeof pLimit>;

  constructor(concurrency = 10) {
    this.limiter = pLimit(concurrency);
  }

  async acquire(): Promise<void> {
    await this.limiter(() => Promise.resolve());
  }
}

/**
 * Custom error class for OpenRouter service
 */
export class OpenRouterServiceError extends Error implements OpenRouterError {
  code: OpenRouterErrorCode;
  retryable: boolean;
  metadata?: {
    requestId?: string;
    correlationId?: string;
    statusCode?: number;
    retryAfter?: number;
    [key: string]: unknown;
  };

  constructor(error: OpenRouterError) {
    super(error.message);
    this.name = "OpenRouterServiceError";
    this.code = error.code;
    this.retryable = error.retryable;
    this.metadata = error.metadata;

    // Maintain proper stack trace for where the error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterServiceError);
    }
  }
}

/**
 * OpenRouter API Service
 *
 * Provides integration with OpenRouter API for LLM chat completions.
 * Features:
 * - HTTP client management
 * - Request/response serialization and validation
 * - JSON Schema validation for structured responses
 * - Retry with exponential backoff
 * - Rate limiting
 * - Error handling and logging
 */
export class OpenRouterService {
  // Public readonly fields
  readonly defaultModel: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;

  // Private fields
  private _apiKey: string;
  private _logger: LoggerInterface;
  private _rateLimiter: RateLimiterInterface;
  private _ajv: Ajv;
  private _schemaValidators: Map<string, ValidateFunction>;

  /**
   * Creates a new OpenRouterService instance
   *
   * @param options Configuration options
   * @throws {Error} If apiKey is not provided
   */
  constructor(options: OpenRouterServiceOptions) {
    // Validate required fields
    if (!options.apiKey) {
      throw new Error("OpenRouterService: apiKey is required");
    }

    // Set public fields
    this.defaultModel = options.defaultModel || "gpt-4o-mini";
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this.timeoutMs = options.timeoutMs || 60000; // 60 seconds default
    this.maxRetries = options.maxRetries || 3;

    // Set private fields
    this._apiKey = options.apiKey;
    this._logger = options.logger || new ConsoleLogger();
    this._rateLimiter = options.rateLimiter || new InMemoryRateLimiter();

    // Initialize AJV for JSON Schema validation
    this._ajv = new Ajv({
      strict: false,
      allErrors: true,
      verbose: true,
    });
    this._schemaValidators = new Map();

    this._logger.info("OpenRouterService initialized", {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Sends a chat completion request to OpenRouter
   *
   * @param params Chat completion parameters
   * @returns Model response
   * @throws {OpenRouterServiceError} On API errors
   */
  async sendChatCompletion(params: SendChatParams): Promise<ModelResponse> {
    // Validate input
    this._validateChatParams(params);

    const model = params.model || this.defaultModel;
    const correlationId = params.metadata?.correlationId || this._generateId();

    this._logger.debug("Sending chat completion request", {
      model,
      correlationId,
      messageCount: params.messages.length,
    });

    try {
      // Apply rate limiting
      await this._applyRateLimit("global");

      // Prepare request payload
      const payload = this._prepareRequestPayload(params);

      // Execute request with retry
      const response = await this._retryWithBackoff(() => this._executeRequest(payload, correlationId), correlationId);

      this._logger.info("Chat completion successful", {
        model: response.model,
        correlationId,
        tokensUsed: response.usage?.total_tokens,
      });

      return response;
    } catch (error) {
      this._logger.error("Chat completion failed", {
        model,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parses and validates structured response according to response_format
   *
   * @param raw Raw response data
   * @param format Response format with JSON Schema
   * @returns Validated response
   * @throws {OpenRouterServiceError} If validation fails
   */
  parseAndValidateStructuredResponse<T = unknown>(raw: ModelResponse, format: ResponseFormat): ValidatedResponse<T> {
    if (!raw.choices || raw.choices.length === 0) {
      throw new OpenRouterServiceError({
        code: "RESPONSE_VALIDATION_ERROR" as OpenRouterErrorCode,
        message: "No choices in response",
        retryable: false,
      });
    }

    const content = raw.choices[0].message.content;

    // Parse JSON from content
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(content);
    } catch (error) {
      throw new OpenRouterServiceError({
        code: "RESPONSE_VALIDATION_ERROR" as OpenRouterErrorCode,
        message: "Failed to parse JSON from response content",
        retryable: false,
        metadata: {
          parseError: error instanceof Error ? error.message : String(error),
        },
      });
    }

    // Validate against schema
    const isValid = this._validateJsonSchema(parsedData, format.json_schema.schema);
    if (!isValid) {
      const errors = this._ajv.errorsText();
      throw new OpenRouterServiceError({
        code: "RESPONSE_VALIDATION_ERROR" as OpenRouterErrorCode,
        message: `Response validation failed: ${errors}`,
        retryable: false,
        metadata: {
          validationErrors: errors,
        },
      });
    }

    return {
      data: parsedData as T,
      raw: content,
      metadata: {
        model: raw.model,
        tokens: raw.usage
          ? {
              prompt: raw.usage.prompt_tokens,
              completion: raw.usage.completion_tokens,
              total: raw.usage.total_tokens,
            }
          : undefined,
      },
    };
  }

  /**
   * Health check for OpenRouter API
   *
   * @returns True if API is accessible
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this._executeRequest(
        {
          model: this.defaultModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        },
        "ping"
      );
      return response.choices.length > 0;
    } catch (error) {
      this._logger.warn("Ping failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Updates the API key
   *
   * @param newKey New API key
   */
  setApiKey(newKey: string): void {
    if (!newKey) {
      throw new Error("API key cannot be empty");
    }
    this._apiKey = newKey;
    this._logger.info("API key updated");
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    this._schemaValidators.clear();
    this._logger.info("OpenRouterService closed");
  }

  // ========== Private Methods ==========

  /**
   * Validates chat completion parameters
   */
  private _validateChatParams(params: SendChatParams): void {
    if (!params.messages || params.messages.length === 0) {
      throw new OpenRouterServiceError({
        code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
        message: "Messages array cannot be empty",
        retryable: false,
      });
    }

    // Validate temperature range
    if (params.temperature !== undefined) {
      if (params.temperature < 0 || params.temperature > 2) {
        throw new OpenRouterServiceError({
          code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
          message: "Temperature must be between 0 and 2",
          retryable: false,
        });
      }
    }

    // Validate top_p range
    if (params.top_p !== undefined) {
      if (params.top_p < 0 || params.top_p > 1) {
        throw new OpenRouterServiceError({
          code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
          message: "top_p must be between 0 and 1",
          retryable: false,
        });
      }
    }

    // Validate max_tokens
    if (params.max_tokens !== undefined) {
      if (params.max_tokens < 1 || params.max_tokens > 32000) {
        throw new OpenRouterServiceError({
          code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
          message: "max_tokens must be between 1 and 32000",
          retryable: false,
        });
      }
    }

    // Validate response_format schema if present
    if (params.response_format) {
      this._validateResponseFormatSchema(params.response_format);
    }
  }

  /**
   * Validates response format schema
   */
  private _validateResponseFormatSchema(format: ResponseFormat): void {
    if (!format.json_schema || !format.json_schema.schema) {
      throw new OpenRouterServiceError({
        code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
        message: "response_format must include json_schema.schema",
        retryable: false,
      });
    }

    // Try to compile the schema
    try {
      this._ajv.compile(format.json_schema.schema);
    } catch (error) {
      throw new OpenRouterServiceError({
        code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
        message: "Invalid JSON Schema in response_format",
        retryable: false,
        metadata: {
          schemaError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Prepares request payload for OpenRouter API
   */
  private _prepareRequestPayload(params: SendChatParams): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: params.model || this.defaultModel,
      messages: params.messages,
    };

    // Add optional parameters
    if (params.response_format) {
      payload.response_format = params.response_format;
    }
    if (params.temperature !== undefined) {
      payload.temperature = params.temperature;
    }
    if (params.top_p !== undefined) {
      payload.top_p = params.top_p;
    }
    if (params.max_tokens !== undefined) {
      payload.max_tokens = params.max_tokens;
    }
    if (params.presence_penalty !== undefined) {
      payload.presence_penalty = params.presence_penalty;
    }
    if (params.frequency_penalty !== undefined) {
      payload.frequency_penalty = params.frequency_penalty;
    }

    return payload;
  }

  /**
   * Executes HTTP request to OpenRouter API
   */
  private async _executeRequest(payload: Record<string, unknown>, correlationId: string): Promise<ModelResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`,
          "HTTP-Referer": "https://10xpricehistory.com",
          "X-Title": "10xPriceHistory",
          "X-Correlation-ID": correlationId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return await this._handleResponse(response, correlationId);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterServiceError({
          code: "TIMEOUT_ERROR" as OpenRouterErrorCode,
          message: `Request timeout after ${this.timeoutMs}ms`,
          retryable: true,
          metadata: { correlationId },
        });
      }

      throw new OpenRouterServiceError({
        code: "NETWORK_ERROR" as OpenRouterErrorCode,
        message: error instanceof Error ? error.message : "Network request failed",
        retryable: true,
        metadata: {
          correlationId,
          originalError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Handles and normalizes API response
   */
  private async _handleResponse(response: Response, correlationId: string): Promise<ModelResponse> {
    const statusCode = response.status;

    // Success
    if (statusCode === 200) {
      try {
        const data = (await response.json()) as ModelResponse;
        return data;
      } catch (error) {
        throw new OpenRouterServiceError({
          code: "UPSTREAM_ERROR" as OpenRouterErrorCode,
          message: "Failed to parse response JSON",
          retryable: false,
          metadata: {
            correlationId,
            statusCode,
            parseError: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    // Get error details
    let errorMessage = `HTTP ${statusCode}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors for error responses
    }

    // Authentication errors (401, 403)
    if (statusCode === 401 || statusCode === 403) {
      throw new OpenRouterServiceError({
        code: "AUTH_ERROR" as OpenRouterErrorCode,
        message: `Authentication failed: ${errorMessage}`,
        retryable: false,
        metadata: { correlationId, statusCode },
      });
    }

    // Rate limit error (429)
    if (statusCode === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new OpenRouterServiceError({
        code: "RATE_LIMIT_ERROR" as OpenRouterErrorCode,
        message: `Rate limit exceeded: ${errorMessage}`,
        retryable: true,
        metadata: {
          correlationId,
          statusCode,
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        },
      });
    }

    // Server errors (5xx)
    if (statusCode >= 500) {
      throw new OpenRouterServiceError({
        code: "UPSTREAM_ERROR" as OpenRouterErrorCode,
        message: `Server error: ${errorMessage}`,
        retryable: true,
        metadata: { correlationId, statusCode },
      });
    }

    // Client errors (4xx)
    throw new OpenRouterServiceError({
      code: "INVALID_REQUEST_ERROR" as OpenRouterErrorCode,
      message: `Client error: ${errorMessage}`,
      retryable: false,
      metadata: { correlationId, statusCode },
    });
  }

  /**
   * Executes operation with retry and exponential backoff
   */
  private async _retryWithBackoff<T>(fn: () => Promise<T>, correlationId: string): Promise<T> {
    return pRetry(fn, {
      retries: this.maxRetries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      randomize: true,
      onFailedAttempt: (error) => {
        // Don't retry non-retryable errors
        if (error instanceof OpenRouterServiceError && !error.retryable) {
          throw error;
        }

        this._logger.warn("Retry attempt", {
          correlationId,
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          error: error.message,
        });

        // Handle rate limit retry-after
        if (
          error instanceof OpenRouterServiceError &&
          error.code === "RATE_LIMIT_ERROR" &&
          error.metadata?.retryAfter
        ) {
          const retryAfterMs = error.metadata.retryAfter * 1000;
          this._logger.info("Rate limited, waiting", {
            correlationId,
            retryAfterMs,
          });
          return new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        }
      },
    });
  }

  /**
   * Applies rate limiting before request
   */
  private async _applyRateLimit(key: string): Promise<void> {
    await this._rateLimiter.acquire(key);
  }

  /**
   * Validates data against JSON Schema
   */
  private _validateJsonSchema(data: unknown, schema: JsonSchema): boolean {
    // Get or create validator for this schema
    const schemaKey = JSON.stringify(schema);
    let validator = this._schemaValidators.get(schemaKey);

    if (!validator) {
      validator = this._ajv.compile(schema);
      this._schemaValidators.set(schemaKey, validator);
    }

    return validator(data);
  }

  /**
   * Generates a unique request ID
   */
  private _generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
