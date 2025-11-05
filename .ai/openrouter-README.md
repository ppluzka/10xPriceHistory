# OpenRouter Service - Dokumentacja główna

Kompletna implementacja integracji z OpenRouter API dla aplikacji 10xPriceHistory.

## 📋 Spis treści

1. [Szybki start](#szybki-start)
2. [Architektura](#architektura)
3. [Pliki projektu](#pliki-projektu)
4. [Konfiguracja](#konfiguracja)
5. [API Reference](#api-reference)
6. [Bezpieczeństwo](#bezpieczeństwo)
7. [Troubleshooting](#troubleshooting)

---

## Szybki start

### 1. Instalacja zależności

Zależności są już zainstalowane w projekcie:

- `ajv` - walidacja JSON Schema
- `p-retry` - retry z exponential backoff
- `p-limit` - rate limiting

### 2. Konfiguracja

Dodaj do pliku `.env` w głównym katalogu projektu:

```bash
# OpenRouter API Key (wymagane)
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Opcjonalne (wartości domyślne pokazane poniżej)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=gpt-4o-mini
OPENROUTER_TIMEOUT_MS=60000
OPENROUTER_MAX_RETRIES=3
```

### 3. Użycie w backend (Astro endpoint)

```typescript
import { OpenRouterService } from "../lib/openrouter.service";

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
});

const response = await service.sendChatCompletion({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
});

console.log(response.choices[0].message.content);
```

### 4. Użycie przez API endpoint

```bash
# Health check
curl http://localhost:4321/api/llm

# Chat completion
curl -X POST http://localhost:4321/api/llm \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 5. Użycie w frontend (React)

```tsx
const response = await fetch("/api/llm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Analyze this car price: 65000 PLN" }],
  }),
});

const data = await response.json();
console.log(data);
```

---

## Architektura

### Diagram komponentów

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Chat Components                                           │
│  - useAICompletion Hook                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST /api/llm
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Endpoint (Astro)                      │
│  - Request Validation (Zod)                                  │
│  - Authentication (Supabase)                                 │
│  - Error Mapping                                             │
└────────────────────────┬────────────────────────────────────┘
                         │ Service Call
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   OpenRouterService                          │
│  - Request Preparation                                       │
│  - HTTP Client (fetch)                                       │
│  - Response Validation                                       │
│  - JSON Schema Validation (AJV)                              │
│  - Retry with Backoff (p-retry)                              │
│  - Rate Limiting (p-limit)                                   │
│  - Logging & Metrics                                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenRouter API                            │
│  - Model Selection                                           │
│  - LLM Processing                                            │
│  - Response Generation                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Frontend** → wysyła zapytanie do `/api/llm`
2. **API Endpoint** → waliduje request (Zod) i autoryzuje użytkownika
3. **OpenRouterService** → przygotowuje payload i wysyła do OpenRouter
4. **Rate Limiter** → sprawdza limity przed wysłaniem
5. **HTTP Client** → wykonuje request z timeout i retry
6. **OpenRouter API** → przetwarza przez wybrany model LLM
7. **Response Handler** → waliduje i normalizuje odpowiedź
8. **JSON Validator** → waliduje strukturę (jeśli `response_format`)
9. **API Endpoint** → mapuje błędy na statusy HTTP
10. **Frontend** → otrzymuje odpowiedź lub błąd

---

## Pliki projektu

### Core Service

- **`src/lib/openrouter.service.ts`** - główny serwis integracji
- **`src/lib/rate-limiter.service.ts`** - zaawansowany rate limiting per-user

### API Endpoints

- **`src/pages/api/llm.ts`** - endpoint proxy dla LLM
  - `POST /api/llm` - chat completion
  - `GET /api/llm` - health check

### Types

- **`src/types.ts`** - typy TypeScript dla całego projektu
  - `ChatMessage`, `ChatMessageRole`
  - `SendChatParams`, `ModelResponse`
  - `ResponseFormat`, `JsonSchema`
  - `ValidatedResponse`
  - `OpenRouterError`, `OpenRouterErrorCode`

### Documentation

- **`.ai/openrouter-service-implementation-plan.md`** - szczegółowy plan implementacji
- **`.ai/openrouter-usage-examples.md`** - przykłady użycia
- **`.ai/openrouter-observability.md`** - monitoring i observability
- **`.ai/openrouter-README.md`** - ten dokument

---

## Konfiguracja

### Environment Variables

| Zmienna                    | Wymagana | Domyślna wartość               | Opis                   |
| -------------------------- | -------- | ------------------------------ | ---------------------- |
| `OPENROUTER_API_KEY`       | ✅ Tak   | -                              | Klucz API z OpenRouter |
| `OPENROUTER_BASE_URL`      | ❌ Nie   | `https://openrouter.ai/api/v1` | Base URL API           |
| `OPENROUTER_DEFAULT_MODEL` | ❌ Nie   | `gpt-4o-mini`                  | Domyślny model         |
| `OPENROUTER_TIMEOUT_MS`    | ❌ Nie   | `60000`                        | Timeout (ms)           |
| `OPENROUTER_MAX_RETRIES`   | ❌ Nie   | `3`                            | Maks. retry            |

### Rate Limiting

Domyślna konfiguracja rate limitera:

**Development:**

- 1000 requests / minute (global)
- 50 concurrent requests

**Production:**

- 100 requests / minute (per user)
- 20 concurrent requests

Można dostosować w konstruktorze:

```typescript
import { EnhancedRateLimiter } from "./lib/rate-limiter.service";

const rateLimiter = new EnhancedRateLimiter({
  maxRequests: 50, // 50 requestów
  windowMs: 60000, // na minutę
  perUser: true, // per user
  concurrency: 10, // 10 równoległych
});

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  rateLimiter,
});
```

### Model Selection

Wspierane modele (przykłady):

- `gpt-4o-mini` - szybki, tani (domyślny)
- `gpt-4o` - najbardziej zaawansowany
- `claude-3-opus` - wysokiej jakości odpowiedzi
- `claude-3-sonnet` - balans cena/jakość

Lista wszystkich modeli: https://openrouter.ai/models

---

## API Reference

### OpenRouterService

#### Constructor

```typescript
constructor(options: OpenRouterServiceOptions)
```

**Options:**

```typescript
interface OpenRouterServiceOptions {
  apiKey: string; // Wymagane
  baseUrl?: string; // Opcjonalne
  defaultModel?: string; // Opcjonalne
  timeoutMs?: number; // Opcjonalne
  maxRetries?: number; // Opcjonalne
  rateLimiter?: RateLimiterInterface; // Opcjonalne
  logger?: LoggerInterface; // Opcjonalne
}
```

#### Methods

##### `sendChatCompletion(params: SendChatParams): Promise<ModelResponse>`

Wysyła chat completion request.

**Params:**

```typescript
interface SendChatParams {
  messages: ChatMessage[]; // Wymagane
  model?: string; // Opcjonalne
  response_format?: ResponseFormat; // Opcjonalne
  temperature?: number; // 0-2, domyślnie 1
  top_p?: number; // 0-1, domyślnie 1
  max_tokens?: number; // 1-32000
  presence_penalty?: number; // -2 do 2
  frequency_penalty?: number; // -2 do 2
  metadata?: {
    correlationId?: string;
    userId?: string;
  };
}
```

**Returns:** `ModelResponse` z pełną odpowiedzią modelu

**Throws:** `OpenRouterServiceError` przy błędach

##### `parseAndValidateStructuredResponse<T>(raw: ModelResponse, format: ResponseFormat): ValidatedResponse<T>`

Parsuje i waliduje strukturyzowaną odpowiedź.

**Returns:**

```typescript
interface ValidatedResponse<T> {
  data: T; // Zwalidowane dane
  raw: string; // Raw JSON string
  metadata: {
    model: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}
```

##### `ping(): Promise<boolean>`

Health check - sprawdza czy API jest dostępne.

##### `setApiKey(newKey: string): void`

Bezpieczna rotacja klucza API.

##### `close(): Promise<void>`

Czyści zasoby (cache, timery).

---

## Bezpieczeństwo

### ✅ Zaimplementowane zabezpieczenia

1. **API Key Storage**
   - Przechowywany w zmiennych środowiskowych
   - Nigdy nie commitowany do repo
   - Maskowany w logach

2. **Input Validation**
   - Walidacja Zod dla wszystkich requestów
   - Sanityzacja user input
   - Limity długości message

3. **Rate Limiting**
   - Per-user rate limiting
   - Global concurrency limit
   - Automatyczne backoff przy 429

4. **Error Handling**
   - Nie wyciekają wrażliwe dane
   - Strukturyzowane błędy z kodami
   - Proper HTTP status codes

5. **Timeouts**
   - Request timeout (60s default)
   - Abort controller dla fetch
   - Retry z exponential backoff

6. **Authorization**
   - Wszystkie endpointy sprawdzają `locals.current_user_id`
   - Integration z Supabase auth

### 🔒 Najlepsze praktyki

- ✅ Używaj HTTPS w production
- ✅ Regularnie rotuj klucze API
- ✅ Monitoruj auth errors (401/403)
- ✅ Ustaw limity rate limiting
- ✅ Nie loguj pełnych payloadów w prod
- ✅ Używaj secure headers (CSP, CORS)

---

## Troubleshooting

### Problem: "OPENROUTER_API_KEY environment variable is not set"

**Rozwiązanie:**

1. Utwórz plik `.env` w głównym katalogu
2. Dodaj `OPENROUTER_API_KEY=sk-or-v1-...`
3. Restart dev server

### Problem: "Rate limit exceeded"

**Rozwiązanie:**

1. Sprawdź usage: `rateLimiter.getStatus("user_id")`
2. Zwiększ limity w konfiguracji
3. Lub zaczekaj na reset okresu (pokazany w error)

### Problem: "Authentication failed: 401"

**Rozwiązanie:**

1. Sprawdź czy klucz API jest poprawny
2. Sprawdź czy klucz nie wygasł
3. Wygeneruj nowy klucz na https://openrouter.ai/keys

### Problem: "Request timeout after 60000ms"

**Rozwiązanie:**

1. Zwiększ timeout: `timeoutMs: 120000`
2. Użyj mniejszego modelu (szybszy)
3. Zmniejsz `max_tokens`
4. Sprawdź połączenie internetowe

### Problem: "Response validation failed"

**Rozwiązanie:**

1. Sprawdź czy JSON Schema jest poprawny
2. Dodaj `strict: false` dla lenient mode
3. Sprawdź prompt - czy prosi o poprawny format?
4. Użyj `temperature: 0.2` dla bardziej deterministycznych odpowiedzi

### Problem: High error rate (>5%)

**Rozwiązanie:**

1. Sprawdź logi: `metricsCollector.getMetrics()`
2. Sprawdź health: `GET /api/llm`
3. Monitoruj OpenRouter status: https://status.openrouter.ai
4. Sprawdź czy nie przekroczono budżetu na koncie

### Problem: Wysokie koszty tokenów

**Rozwiązanie:**

1. Użyj tańszego modelu: `gpt-4o-mini` zamiast `gpt-4o`
2. Ogranicz `max_tokens`
3. Skróć system prompt
4. Implementuj cache dla częstych zapytań
5. Monitoruj: `response.usage.total_tokens`

---

## Metryki i monitoring

### Sprawdzanie metryk

```bash
# Health check
curl http://localhost:4321/api/llm

# Metryki (jeśli zaimplementowane)
curl http://localhost:4321/api/metrics \
  -H "Authorization: Bearer YOUR_METRICS_KEY"
```

### Kluczowe wskaźniki

Monitoruj te metryki:

- ✅ **Success Rate** > 99%
- ✅ **P95 Latency** < 5s
- ✅ **Error Rate** < 1%
- ✅ **Token Usage** w ramach budżetu

Zobacz więcej w: `.ai/openrouter-observability.md`

---

## Dodatkowe zasoby

### Dokumentacja zewnętrzna

- [OpenRouter API Docs](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter Pricing](https://openrouter.ai/pricing)

### Dokumentacja projektu

- [Plan implementacji](./.ai/openrouter-service-implementation-plan.md)
- [Przykłady użycia](./.ai/openrouter-usage-examples.md)
- [Observability](./.ai/openrouter-observability.md)

### Support

- OpenRouter Discord: https://discord.gg/openrouter
- OpenRouter Status: https://status.openrouter.ai

---

## Changelog

### v1.0.0 (2025-11-02)

- ✅ Implementacja podstawowego serwisu
- ✅ JSON Schema validation (AJV)
- ✅ Retry z exponential backoff
- ✅ Rate limiting (per-user)
- ✅ Comprehensive error handling
- ✅ API endpoint `/api/llm`
- ✅ Health check
- ✅ TypeScript types
- ✅ Dokumentacja

---

## Licencja

Część projektu 10xPriceHistory.

---

**Pytania?** Sprawdź dokumentację lub kontakt z zespołem developerskim.
