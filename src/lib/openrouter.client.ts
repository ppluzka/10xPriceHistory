/**
 * OpenRouter Client - Frontend Helper
 *
 * This file provides a simple client-side interface for interacting
 * with the OpenRouter API through the backend proxy endpoint.
 *
 * Usage in React components:
 *
 * ```tsx
 * import { sendChatCompletion } from "../lib/openrouter.client";
 *
 * const response = await sendChatCompletion({
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * ```
 */

import type { ChatMessage, SendChatParams, ModelResponse } from "../types";
import { apiFetch } from "./utils";

/**
 * API response wrapper
 */
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  code?: string;
  retryAfter?: number;
}

/**
 * Client-side error for API calls
 */
export class OpenRouterClientError extends Error {
  code?: string;
  statusCode: number;
  retryAfter?: number;

  constructor(message: string, statusCode: number, code?: string, retryAfter?: number) {
    super(message);
    this.name = "OpenRouterClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * Send a chat completion request to the backend
 *
 * @param params Chat completion parameters
 * @returns Model response
 * @throws {OpenRouterClientError} On API errors
 *
 * @example
 * ```ts
 * const response = await sendChatCompletion({
 *   messages: [
 *     { role: "system", content: "You are a helpful assistant." },
 *     { role: "user", content: "Hello!" }
 *   ],
 *   temperature: 0.7
 * });
 *
 * console.log(response.choices[0].message.content);
 * ```
 */
export async function sendChatCompletion(params: Omit<SendChatParams, "metadata">): Promise<ModelResponse> {
  const response = await apiFetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data: APIResponse<ModelResponse> = await response.json();

  if (!response.ok) {
    throw new OpenRouterClientError(
      data.details || data.error || "Request failed",
      response.status,
      data.code,
      data.retryAfter
    );
  }

  if (!data.success || !data.data) {
    throw new OpenRouterClientError("Invalid response from server", response.status);
  }

  return data.data;
}

/**
 * Send a simple chat message (convenience method)
 *
 * @param message User message
 * @param systemPrompt Optional system prompt
 * @returns Assistant's response text
 *
 * @example
 * ```ts
 * const answer = await chat("What's the weather?", "You are a weather expert.");
 * console.log(answer);
 * ```
 */
export async function chat(message: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: message });

  const response = await sendChatCompletion({ messages });

  return response.choices[0]?.message.content || "";
}

/**
 * Send a structured request with JSON Schema validation
 *
 * @param params Chat completion parameters with response_format
 * @returns Validated structured data
 *
 * @example
 * ```ts
 * interface PriceAnalysis {
 *   recommendation: string;
 *   confidence: number;
 * }
 *
 * const result = await sendStructuredCompletion<PriceAnalysis>({
 *   messages: [{ role: "user", content: "Analyze this price" }],
 *   response_format: {
 *     type: "json_schema",
 *     json_schema: {
 *       name: "analysis",
 *       strict: true,
 *       schema: {
 *         type: "object",
 *         properties: {
 *           recommendation: { type: "string" },
 *           confidence: { type: "number" }
 *         },
 *         required: ["recommendation", "confidence"],
 *         additionalProperties: false
 *       }
 *     }
 *   }
 * });
 *
 * console.log(result.recommendation);
 * ```
 */
export async function sendStructuredCompletion<T = unknown>(params: Omit<SendChatParams, "metadata">): Promise<T> {
  if (!params.response_format) {
    throw new Error("response_format is required for structured completion");
  }

  const response = await apiFetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const apiResponse: APIResponse<T> = await response.json();

  if (!response.ok) {
    throw new OpenRouterClientError(
      apiResponse.details || apiResponse.error || "Request failed",
      response.status,
      apiResponse.code,
      apiResponse.retryAfter
    );
  }

  if (!apiResponse.success || !apiResponse.data) {
    throw new OpenRouterClientError("Invalid response from server", response.status);
  }

  return apiResponse.data;
}

/**
 * Check health of the OpenRouter service
 *
 * @returns True if service is healthy
 *
 * @example
 * ```ts
 * const isHealthy = await checkHealth();
 * if (!isHealthy) {
 *   console.error("Service unavailable");
 * }
 * ```
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await apiFetch("/api/llm", {
      method: "GET",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}

/**
 * Helper to create a system message
 */
export function systemMessage(content: string): ChatMessage {
  return { role: "system", content };
}

/**
 * Helper to create a user message
 */
export function userMessage(content: string): ChatMessage {
  return { role: "user", content };
}

/**
 * Helper to create an assistant message
 */
export function assistantMessage(content: string): ChatMessage {
  return { role: "assistant", content };
}
