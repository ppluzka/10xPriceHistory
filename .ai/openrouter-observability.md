# OpenRouter Service - Observability & Monitoring

Dokument opisuje najlepsze praktyki monitorowania, logowania i debugowania OpenRouter Service.

## Spis treści

1. [Metryki](#metryki)
2. [Logging](#logging)
3. [Health Checks](#health-checks)
4. [Alerting](#alerting)
5. [Performance Monitoring](#performance-monitoring)
6. [Debug Mode](#debug-mode)

---

## Metryki

### Kluczowe metryki do śledzenia

#### 1. Request Metrics
- **Total Requests** - łączna liczba zapytań
- **Success Rate** - procent udanych zapytań
- **Error Rate** - procent błędów (per error code)
- **Request Duration** - czas trwania zapytań (p50, p95, p99)
- **Tokens Used** - łączne użycie tokenów

#### 2. Rate Limiting Metrics
- **Rate Limit Hits** - liczba odrzuceń przez rate limiter
- **Current Rate Limit Usage** - aktualne wykorzystanie limitu per user
- **Concurrency Usage** - aktualna liczba równoległych zapytań

#### 3. Error Metrics
- **Auth Errors** (401/403) - problemy z kluczem API
- **Rate Limit Errors** (429) - przekroczenie limitów OpenRouter
- **Timeout Errors** - przekroczenie timeout
- **Upstream Errors** (5xx) - błędy serwera OpenRouter
- **Network Errors** - problemy z połączeniem
- **Validation Errors** - błędy walidacji schema

### Implementacja metryk

```typescript
// src/lib/metrics.service.ts
export interface Metrics {
  requests: {
    total: number;
    success: number;
    errors: Record<string, number>;
  };
  tokens: {
    total: number;
    byModel: Record<string, number>;
  };
  latency: {
    samples: number[];
    p50: number;
    p95: number;
    p99: number;
  };
  rateLimits: {
    hits: number;
    currentUsage: number;
  };
}

export class MetricsCollector {
  private metrics: Metrics = {
    requests: { total: 0, success: 0, errors: {} },
    tokens: { total: 0, byModel: {} },
    latency: { samples: [], p50: 0, p95: 0, p99: 0 },
    rateLimits: { hits: 0, currentUsage: 0 },
  };

  recordRequest(success: boolean, errorCode?: string): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else if (errorCode) {
      this.metrics.requests.errors[errorCode] =
        (this.metrics.requests.errors[errorCode] || 0) + 1;
    }
  }

  recordTokens(tokens: number, model: string): void {
    this.metrics.tokens.total += tokens;
    this.metrics.tokens.byModel[model] =
      (this.metrics.tokens.byModel[model] || 0) + tokens;
  }

  recordLatency(durationMs: number): void {
    this.metrics.latency.samples.push(durationMs);

    // Keep only last 1000 samples
    if (this.metrics.latency.samples.length > 1000) {
      this.metrics.latency.samples.shift();
    }

    // Calculate percentiles
    const sorted = [...this.metrics.latency.samples].sort((a, b) => a - b);
    const len = sorted.length;
    this.metrics.latency.p50 = sorted[Math.floor(len * 0.5)];
    this.metrics.latency.p95 = sorted[Math.floor(len * 0.95)];
    this.metrics.latency.p99 = sorted[Math.floor(len * 0.99)];
  }

  recordRateLimitHit(): void {
    this.metrics.rateLimits.hits++;
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  getSuccessRate(): number {
    const total = this.metrics.requests.total;
    return total > 0 ? (this.metrics.requests.success / total) * 100 : 100;
  }

  reset(): void {
    this.metrics = {
      requests: { total: 0, success: 0, errors: {} },
      tokens: { total: 0, byModel: {} },
      latency: { samples: [], p50: 0, p95: 0, p99: 0 },
      rateLimits: { hits: 0, currentUsage: 0 },
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
```

### Endpoint metryk

```typescript
// src/pages/api/metrics.ts
import type { APIRoute } from "astro";
import { metricsCollector } from "../../lib/metrics.service";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Opcjonalna autoryzacja dla endpointu metryk
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${import.meta.env.METRICS_API_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metrics = metricsCollector.getMetrics();
  const successRate = metricsCollector.getSuccessRate();

  return new Response(
    JSON.stringify({
      ...metrics,
      successRate,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
```

---

## Logging

### Structured Logging

```typescript
// src/lib/logger.service.ts
import type { LoggerInterface } from "./openrouter.service";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
  correlationId?: string;
}

export class StructuredLogger implements LoggerInterface {
  private level: LogLevel;
  private context: string;

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: Record<string, unknown>): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message: `[${this.context}] ${message}`,
      meta: this._sanitizeMeta(meta),
    };

    // Add correlation ID if present
    if (meta?.correlationId) {
      entry.correlationId = meta.correlationId as string;
    }

    const logFn = level === LogLevel.ERROR ? console.error :
                  level === LogLevel.WARN ? console.warn :
                  console.log;

    logFn(JSON.stringify(entry));
  }

  private _sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;

    const sanitized = { ...meta };

    // Mask sensitive fields
    const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'authorization'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***MASKED***';
      }
    }

    return sanitized;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }
}
```

### Integracja z OpenRouter Service

```typescript
import { OpenRouterService } from "./openrouter.service";
import { StructuredLogger, LogLevel } from "./logger.service";

const logger = new StructuredLogger(
  "OpenRouter",
  import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG
);

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  logger,
});
```

### Log Aggregation

Dla produkcji, rozważ integrację z:
- **Datadog** - monitoring i logging
- **Logtail** - agregacja logów
- **Sentry** - error tracking
- **AWS CloudWatch** - jeśli hostowane na AWS

```typescript
// Example: Sentry integration
import * as Sentry from "@sentry/node";

export class SentryLogger implements LoggerInterface {
  info(message: string, meta?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      level: "info",
      data: meta,
    });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    Sentry.captureException(new Error(message), {
      extra: meta,
    });
  }

  // ... other methods
}
```

---

## Health Checks

### Endpoint health check

Już zaimplementowany w `src/pages/api/llm.ts`:

```typescript
// GET /api/llm
const health = await fetch("/api/llm");
const result = await health.json();

// Przykładowa odpowiedź:
// { status: "healthy", service: "openrouter", timestamp: "2025-11-02T..." }
```

### Comprehensive Health Check

```typescript
// src/pages/api/health.ts
import type { APIRoute } from "astro";
import { supabaseClient } from "../../db/supabase.client";

export const prerender = false;

export const GET: APIRoute = async () => {
  const checks = {
    database: false,
    openrouter: false,
  };

  // Check database
  try {
    const { error } = await supabaseClient.from("offers").select("id").limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  // Check OpenRouter
  try {
    const openRouterHealth = await fetch("/api/llm");
    checks.openrouter = openRouterHealth.ok;
  } catch {
    checks.openrouter = false;
  }

  const allHealthy = Object.values(checks).every((check) => check);

  return new Response(
    JSON.stringify({
      status: allHealthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    }
  );
};
```

### Monitoring z uptime checkers

- **UptimeRobot** - darmowy monitoring (50 monitorów)
- **Pingdom** - profesjonalne monitoring
- **Better Uptime** - monitoring z incident management

Konfiguracja:
```bash
# Sprawdzaj co 5 minut
URL: https://yourdomain.com/api/health
Method: GET
Expected: 200 OK
Alert: email/slack/discord przy 3 kolejnych failures
```

---

## Alerting

### Kryteria alertów

#### 1. Error Rate > 5%
```typescript
if (metricsCollector.getSuccessRate() < 95) {
  alert("High error rate detected", {
    successRate: metricsCollector.getSuccessRate(),
    totalRequests: metrics.requests.total,
  });
}
```

#### 2. Authentication Failures
```typescript
if (metrics.requests.errors["AUTH_ERROR"] > 0) {
  alert("Authentication failures - check API key", {
    count: metrics.requests.errors["AUTH_ERROR"],
  });
}
```

#### 3. Rate Limit Hits
```typescript
if (metrics.rateLimits.hits > 100) {
  alert("High rate limit hits - consider upgrading plan", {
    hits: metrics.rateLimits.hits,
  });
}
```

#### 4. High Latency
```typescript
if (metrics.latency.p95 > 10000) { // 10 seconds
  alert("High latency detected", {
    p95: metrics.latency.p95,
    p99: metrics.latency.p99,
  });
}
```

### Alert Channels

```typescript
// src/lib/alerts.service.ts
export interface AlertChannel {
  send(message: string, metadata: Record<string, unknown>): Promise<void>;
}

export class SlackAlertChannel implements AlertChannel {
  constructor(private webhookUrl: string) {}

  async send(message: string, metadata: Record<string, unknown>): Promise<void> {
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        attachments: [
          {
            color: "danger",
            fields: Object.entries(metadata).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
          },
        ],
      }),
    });
  }
}

export class EmailAlertChannel implements AlertChannel {
  async send(message: string, metadata: Record<string, unknown>): Promise<void> {
    // Implement email sending (e.g., via SendGrid, Mailgun)
    console.log("EMAIL ALERT:", message, metadata);
  }
}

// Alert manager
export class AlertManager {
  constructor(private channels: AlertChannel[]) {}

  async alert(message: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await Promise.all(
      this.channels.map((channel) => channel.send(message, metadata))
    );
  }
}
```

---

## Performance Monitoring

### Request Tracing

```typescript
// src/lib/tracing.ts
export class RequestTracer {
  private spans: Map<string, { start: number; name: string }> = new Map();

  startSpan(id: string, name: string): void {
    this.spans.set(id, { start: Date.now(), name });
  }

  endSpan(id: string, metadata?: Record<string, unknown>): void {
    const span = this.spans.get(id);
    if (!span) return;

    const duration = Date.now() - span.start;
    console.log(`[TRACE] ${span.name} took ${duration}ms`, metadata);

    this.spans.delete(id);
  }

  async trace<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const id = `${name}_${Date.now()}_${Math.random()}`;
    this.startSpan(id, name);

    try {
      const result = await fn();
      this.endSpan(id, { success: true });
      return result;
    } catch (error) {
      this.endSpan(id, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Usage
const tracer = new RequestTracer();

const response = await tracer.trace("openrouter_request", async () => {
  return await service.sendChatCompletion({ messages });
});
```

### Performance Budget

Ustaw cele wydajności:
- **API Response Time**: < 2s (p95)
- **LLM Response Time**: < 5s (p95)
- **Success Rate**: > 99%
- **Token Usage**: < 1M tokens/day (adjust based on plan)

### Monitoring Dashboard

Przykład dashboardu metryk:

```typescript
// src/pages/admin/metrics-dashboard.astro
---
import { metricsCollector } from "../../lib/metrics.service";

const metrics = metricsCollector.getMetrics();
const successRate = metricsCollector.getSuccessRate();
---

<div class="metrics-dashboard">
  <div class="metric-card">
    <h3>Success Rate</h3>
    <p class={successRate > 95 ? "good" : "bad"}>
      {successRate.toFixed(2)}%
    </p>
  </div>

  <div class="metric-card">
    <h3>Total Requests</h3>
    <p>{metrics.requests.total}</p>
  </div>

  <div class="metric-card">
    <h3>Tokens Used</h3>
    <p>{metrics.tokens.total.toLocaleString()}</p>
  </div>

  <div class="metric-card">
    <h3>P95 Latency</h3>
    <p>{metrics.latency.p95.toFixed(0)}ms</p>
  </div>

  <div class="metric-card">
    <h3>Rate Limit Hits</h3>
    <p>{metrics.rateLimits.hits}</p>
  </div>
</div>
```

---

## Debug Mode

### Włączanie debug mode

```typescript
import { OpenRouterService } from "./openrouter.service";
import { StructuredLogger, LogLevel } from "./logger.service";

const debugLogger = new StructuredLogger(
  "OpenRouter",
  import.meta.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO
);

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  logger: debugLogger,
});
```

### Debug payload logging

```typescript
// Add to OpenRouterService for debugging
private _logDebugPayload(payload: Record<string, unknown>, correlationId: string): void {
  if (!import.meta.env.DEBUG) return;

  this._logger.debug("Request payload", {
    correlationId,
    payload: JSON.stringify(payload, null, 2),
  });
}

// Use in _executeRequest
this._logDebugPayload(payload, correlationId);
```

### Request/Response logging

```bash
# Enable debug mode
DEBUG=true npm run dev

# Debug logs will include:
# - Request payloads (sanitized)
# - Response data
# - Retry attempts
# - Rate limit status
# - Token usage
```

---

## Przykład pełnej integracji observability

```typescript
// src/lib/services/observed-openrouter.service.ts
import { OpenRouterService } from "../openrouter.service";
import { StructuredLogger, LogLevel } from "../logger.service";
import { metricsCollector } from "../metrics.service";
import { RequestTracer } from "../tracing";
import { AlertManager, SlackAlertChannel } from "../alerts.service";

export class ObservedOpenRouterService {
  private service: OpenRouterService;
  private tracer: RequestTracer;
  private alerts: AlertManager;

  constructor(apiKey: string) {
    const logger = new StructuredLogger(
      "OpenRouter",
      import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG
    );

    this.service = new OpenRouterService({
      apiKey,
      logger,
    });

    this.tracer = new RequestTracer();

    this.alerts = new AlertManager([
      new SlackAlertChannel(import.meta.env.SLACK_WEBHOOK_URL),
    ]);
  }

  async sendChatCompletion(params: SendChatParams) {
    const startTime = Date.now();

    try {
      const response = await this.tracer.trace(
        "chat_completion",
        async () => await this.service.sendChatCompletion(params)
      );

      // Record success metrics
      const duration = Date.now() - startTime;
      metricsCollector.recordRequest(true);
      metricsCollector.recordLatency(duration);
      metricsCollector.recordTokens(
        response.usage?.total_tokens || 0,
        response.model
      );

      return response;
    } catch (error) {
      // Record error metrics
      const errorCode = error instanceof OpenRouterServiceError
        ? error.code
        : "UNKNOWN_ERROR";

      metricsCollector.recordRequest(false, errorCode);

      // Alert on critical errors
      if (errorCode === "AUTH_ERROR") {
        await this.alerts.alert("OpenRouter authentication failed", {
          error: error.message,
        });
      }

      throw error;
    }
  }
}
```

---

## Checklist wdrożenia observability

- [ ] Skonfigurować structured logging
- [ ] Zaimplementować metryki (requests, errors, latency, tokens)
- [ ] Utworzyć endpoint `/api/metrics`
- [ ] Skonfigurować health checks (`/api/health`, `/api/llm`)
- [ ] Ustawić alerting (Slack, email)
- [ ] Monitorować error rate (target: < 1%)
- [ ] Monitorować latency (target: p95 < 5s)
- [ ] Śledzić token usage i koszty
- [ ] Skonfigurować external uptime monitoring
- [ ] Utworzyć dashboard metryk (opcjonalnie)

---

Przy pytaniach lub problemach z observability, sprawdź logi i metryki jako pierwszy krok debugowania.

