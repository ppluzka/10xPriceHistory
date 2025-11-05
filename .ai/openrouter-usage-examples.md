# OpenRouter Service - Przykłady użycia

Ten dokument zawiera praktyczne przykłady użycia OpenRouterService w projekcie.

## Spis treści

1. [Podstawowe użycie](#podstawowe-użycie)
2. [Strukturyzowane odpowiedzi (JSON Schema)](#strukturyzowane-odpowiedzi)
3. [Frontend Integration](#frontend-integration)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Podstawowe użycie

### Backend - prosty chat completion

```typescript
import { OpenRouterService } from "../lib/openrouter.service";

// Inicjalizacja serwisu
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: "gpt-4o-mini",
});

// Prosty request
const response = await service.sendChatCompletion({
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant specialized in car price analysis.",
    },
    {
      role: "user",
      content: "What factors affect used car prices?",
    },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

console.log(response.choices[0].message.content);
```

### Endpoint API - health check

```typescript
// GET /api/llm
const healthCheck = await fetch("/api/llm", {
  method: "GET",
});

const health = await healthCheck.json();
console.log(health);
// { status: "healthy", service: "openrouter", timestamp: "..." }
```

---

## Strukturyzowane odpowiedzi

### Definicja JSON Schema

```typescript
import type { ResponseFormat } from "../types";

// Schema dla analizy cen samochodów
const priceAnalysisSchema: ResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "price_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        averagePrice: {
          type: "number",
          description: "Average price in PLN",
        },
        priceRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          required: ["min", "max"],
          additionalProperties: false,
        },
        factors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              impact: { type: "string", enum: ["positive", "negative", "neutral"] },
              description: { type: "string" },
            },
            required: ["name", "impact", "description"],
            additionalProperties: false,
          },
        },
        recommendation: {
          type: "string",
          description: "Purchase recommendation",
        },
      },
      required: ["averagePrice", "priceRange", "factors", "recommendation"],
      additionalProperties: false,
    },
  },
};
```

### Backend - strukturyzowana odpowiedź

```typescript
// Wyślij request ze schematem
const response = await service.sendChatCompletion({
  messages: [
    {
      role: "system",
      content: "You are a car price analyst. Analyze prices and return structured data.",
    },
    {
      role: "user",
      content: "Analyze this car listing: Toyota Corolla 2020, 80000km, price 65000 PLN",
    },
  ],
  response_format: priceAnalysisSchema,
  temperature: 0.2,
});

// Walidacja i parsowanie
interface PriceAnalysis {
  averagePrice: number;
  priceRange: { min: number; max: number };
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  recommendation: string;
}

const validated = service.parseAndValidateStructuredResponse<PriceAnalysis>(response, priceAnalysisSchema);

console.log(validated.data);
// Fully typed and validated response
console.log(validated.metadata.tokens);
// Token usage stats
```

---

## Frontend Integration

### React Component - Chat z AI

```tsx
import { useState } from "react";
import type { ChatMessage } from "../types";

export function AIChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant for car price tracking.",
            },
            ...messages,
            userMessage,
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.data.choices[0].message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
          placeholder="Ask about car prices..."
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
```

### React Hook - useAICompletion

```tsx
import { useState, useCallback } from "react";
import type { ChatMessage, ResponseFormat } from "../types";

interface UseAICompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useAICompletion<T = unknown>(responseFormat?: ResponseFormat, options: UseAICompletionOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const complete = useCallback(
    async (userMessage: string) => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const messages: ChatMessage[] = [];

        if (options.systemPrompt) {
          messages.push({
            role: "system",
            content: options.systemPrompt,
          });
        }

        messages.push({
          role: "user",
          content: userMessage,
        });

        const response = await fetch("/api/llm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            response_format: responseFormat,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1000,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error);
        }

        const result = await response.json();

        // If response_format was provided, data is already validated
        if (responseFormat) {
          setData(result.data as T);
        } else {
          setData(result.data.choices[0].message.content as T);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Request failed";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [responseFormat, options]
  );

  return {
    complete,
    loading,
    error,
    data,
  };
}

// Przykład użycia
function PriceAnalysisComponent() {
  const { complete, loading, error, data } = useAICompletion<{
    recommendation: string;
    confidence: number;
  }>(
    {
      type: "json_schema",
      json_schema: {
        name: "recommendation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendation: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["recommendation", "confidence"],
          additionalProperties: false,
        },
      },
    },
    {
      systemPrompt: "You are a car price expert. Provide recommendations.",
      temperature: 0.3,
    }
  );

  const analyze = () => {
    complete("Should I buy a 2019 Honda Civic with 120000km for 55000 PLN?");
  };

  return (
    <div>
      <button onClick={analyze} disabled={loading}>
        Analyze
      </button>
      {loading && <p>Analyzing...</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <div>
          <h3>Recommendation</h3>
          <p>{data.recommendation}</p>
          <p>Confidence: {(data.confidence * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
}
```

---

## Rate Limiting

### Per-user rate limiting

```typescript
import { OpenRouterService } from "../lib/openrouter.service";
import { EnhancedRateLimiter } from "../lib/rate-limiter.service";

// Create rate limiter (100 requests per minute per user)
const rateLimiter = new EnhancedRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  perUser: true,
  concurrency: 20,
});

// Create service with rate limiter
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  rateLimiter,
});

// Check rate limit status
const status = rateLimiter.getStatus("user_123");
console.log(`Remaining: ${status.remaining}/${status.limit}`);
console.log(`Resets in: ${status.resetInMs}ms`);

// Rate limit will be applied automatically on requests
try {
  await service.sendChatCompletion({
    messages: [{ role: "user", content: "Hello" }],
    metadata: { userId: "user_123" },
  });
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    // Handle rate limit error
    console.error("Too many requests");
  }
}
```

### Environment-based rate limiter

```typescript
import { createRateLimiter } from "../lib/rate-limiter.service";

// Automatically adjusts limits based on environment
const rateLimiter = createRateLimiter(import.meta.env.PROD ? "production" : "development");

// Development: 1000 req/min, lenient
// Production: 100 req/min, strict per-user
```

---

## Error Handling

### Comprehensive error handling

```typescript
import { OpenRouterServiceError } from "../lib/openrouter.service";

try {
  const response = await service.sendChatCompletion({
    messages: [{ role: "user", content: "Hello" }],
  });
} catch (error) {
  if (error instanceof OpenRouterServiceError) {
    switch (error.code) {
      case "AUTH_ERROR":
        console.error("Authentication failed - check API key");
        // Don't retry
        break;

      case "RATE_LIMIT_ERROR":
        const retryAfter = error.metadata?.retryAfter || 60;
        console.error(`Rate limited - retry after ${retryAfter}s`);
        // Implement backoff
        break;

      case "TIMEOUT_ERROR":
        console.error("Request timeout - model took too long");
        // Retry with longer timeout or smaller model
        break;

      case "UPSTREAM_ERROR":
        console.error("OpenRouter server error");
        // Retry with backoff
        break;

      case "NETWORK_ERROR":
        console.error("Network connection failed");
        // Retry with backoff
        break;

      case "RESPONSE_VALIDATION_ERROR":
        console.error("Response doesn't match schema");
        console.error("Validation errors:", error.metadata);
        // Fix schema or adjust prompt
        break;

      case "INVALID_REQUEST_ERROR":
        console.error("Invalid request parameters");
        // Fix request
        break;

      default:
        console.error("Unknown error:", error.code);
    }

    // Check if retryable
    if (error.retryable) {
      // Implement retry logic
    }
  }
}
```

### Frontend error display

```tsx
function ErrorDisplay({ error }: { error: any }) {
  if (!error) return null;

  const getErrorMessage = (err: any) => {
    if (err.code === "RATE_LIMIT_ERROR") {
      return `Too many requests. Please try again in ${err.retryAfter || 60} seconds.`;
    }
    if (err.code === "AUTH_ERROR") {
      return "Authentication failed. Please contact support.";
    }
    if (err.code === "TIMEOUT_ERROR") {
      return "Request timeout. The model took too long to respond.";
    }
    return err.details || err.error || "An error occurred";
  };

  return (
    <div className="error-banner" role="alert">
      <strong>Error:</strong> {getErrorMessage(error)}
    </div>
  );
}
```

---

## Best Practices

### 1. Always use system prompts

```typescript
const messages = [
  {
    role: "system",
    content:
      "You are a car price expert. " +
      "Always provide accurate information. " +
      "If unsure, say so. " +
      "Format numbers with proper units.",
  },
  {
    role: "user",
    content: userInput,
  },
];
```

### 2. Validate before sending

```typescript
// Validate message length
if (userMessage.length > 10000) {
  throw new Error("Message too long");
}

// Sanitize input
const sanitized = userMessage.trim();
if (!sanitized) {
  throw new Error("Empty message");
}
```

### 3. Use appropriate temperatures

```typescript
// Factual, deterministic responses
const factualResponse = await service.sendChatCompletion({
  messages,
  temperature: 0.2, // Low temperature
});

// Creative, varied responses
const creativeResponse = await service.sendChatCompletion({
  messages,
  temperature: 0.8, // Higher temperature
});
```

### 4. Implement proper logging

```typescript
import { OpenRouterService, type LoggerInterface } from "../lib/openrouter.service";

class CustomLogger implements LoggerInterface {
  info(message: string, meta?: Record<string, unknown>): void {
    // Send to monitoring service
    console.log("[INFO]", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    // Alert on repeated warnings
    console.warn("[WARN]", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    // Send to error tracking (e.g., Sentry)
    console.error("[ERROR]", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.debug("[DEBUG]", message, meta);
    }
  }
}

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  logger: new CustomLogger(),
});
```

### 5. Monitor token usage

```typescript
const response = await service.sendChatCompletion({ messages });

console.log("Tokens used:", {
  prompt: response.usage?.prompt_tokens,
  completion: response.usage?.completion_tokens,
  total: response.usage?.total_tokens,
});

// Estimate cost (example: $0.00002 per token)
const estimatedCost = (response.usage?.total_tokens || 0) * 0.00002;
console.log(`Estimated cost: $${estimatedCost.toFixed(6)}`);
```

### 6. Implement caching for repeated queries

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedCompletion(prompt: string) {
  const cached = cache.get(prompt);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await service.sendChatCompletion({
    messages: [{ role: "user", content: prompt }],
  });

  cache.set(prompt, {
    data: response,
    timestamp: Date.now(),
  });

  return response;
}
```

---

## Testowanie

### Mock dla testów jednostkowych

```typescript
import { describe, it, expect, vi } from "vitest";

describe("OpenRouterService", () => {
  it("should send chat completion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "test-id",
        model: "gpt-4o-mini",
        choices: [
          {
            message: {
              role: "assistant",
              content: "Hello!",
            },
            finish_reason: "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
        created: Date.now(),
      }),
    });

    global.fetch = mockFetch;

    const service = new OpenRouterService({
      apiKey: "test-key",
    });

    const response = await service.sendChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(response.choices[0].message.content).toBe("Hello!");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

---

Ten dokument zawiera kompletne przykłady użycia OpenRouterService. Dla dodatkowych informacji, zobacz:

- Plan implementacji: `openrouter-service-implementation-plan.md`
- Kod źródłowy: `src/lib/openrouter.service.ts`
- Endpoint API: `src/pages/api/llm.ts`
