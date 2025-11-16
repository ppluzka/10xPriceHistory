import type { APIRoute } from "astro";
import { z } from "zod";

import { OpenRouterServiceError } from "../../lib/openrouter.service";
import { createOpenRouterService } from "../../lib/utils/openrouter";
import type { ChatMessage, ResponseFormat } from "../../types";

export const prerender = false;

/**
 * Message schema for Zod validation
 */
const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty"),
});

/**
 * JSON Schema validation for response_format
 */
const JsonSchemaSchema: z.ZodType<Record<string, unknown>> = z.lazy(() => z.record(z.unknown()));

/**
 * Response format schema
 */
const ResponseFormatSchema = z.object({
  type: z.literal("json_schema"),
  json_schema: z.object({
    name: z.string(),
    strict: z.boolean(),
    schema: JsonSchemaSchema,
  }),
});

/**
 * Request body schema for POST /api/llm
 */
const LLMRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1, "At least one message is required")
    .max(50, "Maximum 50 messages allowed"),
  model: z.string().optional(),
  response_format: ResponseFormatSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(32000).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  metadata: z
    .object({
      correlationId: z.string().optional(),
      userId: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/llm
 * Sends a chat completion request to OpenRouter API
 *
 * Request body:
 * {
 *   messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
 *   model?: string,
 *   response_format?: ResponseFormat,
 *   temperature?: number,
 *   top_p?: number,
 *   max_tokens?: number,
 *   presence_penalty?: number,
 *   frequency_penalty?: number,
 *   metadata?: { correlationId?: string, userId?: string }
 * }
 *
 * Response:
 * - 200: Success with model response
 * - 400: Bad Request (validation error)
 * - 401: Unauthorized (missing or invalid API key)
 * - 429: Too Many Requests (rate limit exceeded)
 * - 500: Internal Server Error
 * - 502: Bad Gateway (upstream service error)
 * - 504: Gateway Timeout
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get user ID from middleware for tracking and rate limiting
    const currentUserId = locals.current_user_id as string;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validationResult = LLMRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const params = validationResult.data;

    // Add userId to metadata for tracking
    const metadata = {
      ...params.metadata,
      userId: currentUserId,
    };

    // Get OpenRouter service
    const service = createOpenRouterService({ locals });

    // Send chat completion request
    const response = await service.sendChatCompletion({
      messages: params.messages as ChatMessage[],
      model: params.model,
      response_format: params.response_format as ResponseFormat | undefined,
      temperature: params.temperature,
      top_p: params.top_p,
      max_tokens: params.max_tokens,
      presence_penalty: params.presence_penalty,
      frequency_penalty: params.frequency_penalty,
      metadata,
    });

    // If response_format is provided, validate the response
    if (params.response_format) {
      const validated = service.parseAndValidateStructuredResponse(response, params.response_format as ResponseFormat);

      return new Response(
        JSON.stringify({
          success: true,
          data: validated.data,
          metadata: validated.metadata,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return raw response
    return new Response(
      JSON.stringify({
        success: true,
        data: response,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Handle OpenRouter service errors
    if (error instanceof OpenRouterServiceError) {
      // Authentication errors
      if (error.code === "AUTH_ERROR") {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            details: error.message,
            code: error.code,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Rate limit errors
      if (error.code === "RATE_LIMIT_ERROR") {
        const retryAfter = error.metadata?.retryAfter?.toString() || "60";
        return new Response(
          JSON.stringify({
            error: "Too Many Requests",
            details: error.message,
            code: error.code,
            retryAfter: parseInt(retryAfter, 10),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter,
            },
          }
        );
      }

      // Timeout errors
      if (error.code === "TIMEOUT_ERROR") {
        return new Response(
          JSON.stringify({
            error: "Gateway Timeout",
            details: error.message,
            code: error.code,
          }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Upstream service errors (5xx)
      if (error.code === "UPSTREAM_ERROR") {
        return new Response(
          JSON.stringify({
            error: "Bad Gateway",
            details: error.message,
            code: error.code,
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validation errors
      if (error.code === "RESPONSE_VALIDATION_ERROR" || error.code === "INVALID_REQUEST_ERROR") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            details: error.message,
            code: error.code,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Network errors
      if (error.code === "NETWORK_ERROR") {
        return new Response(
          JSON.stringify({
            error: "Service Unavailable",
            details: error.message,
            code: error.code,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle other errors
    console.error("Error in POST /api/llm:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * GET /api/llm/health
 * Health check endpoint for OpenRouter service
 */
export const GET: APIRoute = async () => {
  try {
    const service = getOpenRouterService();
    const isHealthy = await service.ping();

    if (isHealthy) {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "openrouter",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: "unhealthy",
        service: "openrouter",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        service: "openrouter",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
