<!--
OpenRouter Service Implementation Plan
Stack: Astro 5, TypeScript 5, React 19, Tailwind 4, Shadcn/ui
File generated: implementation guide for developers
-->

# OpenRouter Service — Plan implementacji

Poniższy dokument opisuje kompletną usługę integrującą OpenRouter API dla uzupełniania czatów opartych na LLM. Zawiera opis konstruktora, publicznych i prywatnych API, obsługę błędów, kwestie bezpieczeństwa oraz krok po kroku plan wdrożenia dostosowany do stosu technologicznego projektu.

> Uwaga: plik jest napisany dla backendu TypeScript (Node) współpracującego z frontendem Astro/React. Zakładamy, że środowisko uruchomieniowe używa zmiennych środowiskowych (process.env) i że dostęp do Supabase lub innego magazynu istnieje w projekcie.

---

## 1. Opis usługi

`OpenRouterService` to lekki adapter HTTP, który:
- zarządza komunikacją z OpenRouter API,
- serializuje i waliduje wejście i wyjście (w tym `response_format` JSON Schema),
- obsługuje retry/backoff, limitowanie przepustowości i cache odpowiedzi,
- loguje i monitoruje zapytania bez wycieków kluczy.

Główne cele:
- prosty interfejs do wywołań modeli LLM,
- bezpieczne przechowywanie i rotacja kluczy,
- obsługa strukturyzowanych odpowiedzi (`response_format`) i walidacja.

---

## 2. Opis konstruktora

Proponowana sygnatura konstruktora (TypeScript):

```ts
interface OpenRouterServiceOptions {
  apiKey: string; // odczyt z env, nie commitować
  baseUrl?: string; // opcjonalne: override OpenRouter base URL
  defaultModel?: string; // np. "gpt-4o-mini"
  timeoutMs?: number; // request timeout
  maxRetries?: number; // retry dla transient errors
  rateLimiter?: RateLimiterInterface; // opcjonalnie wstrzykiwane
  logger?: LoggerInterface; // kompatybilny z pino/winston
}

class OpenRouterService {
  constructor(options: OpenRouterServiceOptions)
}
```

Konstruktor:
- waliduje obecność `apiKey`
- ustawia domyślne parametry (timeout, maxRetries)
- inicjalizuje klienta HTTP (np. fetch lub axios) z nagłówkiem Authorization
- opcjonalnie wstrzykuje rate-limiter i logger

---

## 3. Publiczne metody i pola

Zalecane publiczne API klasy `OpenRouterService`:

- `sendChatCompletion(params: SendChatParams): Promise<ModelResponse>`
  - Główna metoda służąca do wysyłania konwersacji i otrzymywania odpowiedzi.
  - Parametry:
    - `messages: Array<{ role: 'system'|'user'|'assistant'; content: string }>`
    - `model?: string`
    - `response_format?: ResponseFormat` (opis poniżej)
    - `temperature?`, `top_p?`, `max_tokens?` itp.
    - `metadata?` (correlationId, userId)

- `parseAndValidateStructuredResponse(raw: any, format: ResponseFormat): ValidatedResponse`
  - Parsuje i waliduje odpowiedź modelu zgodnie ze zdefiniowanym `response_format` (JSON Schema)

- `ping(): Promise<boolean>`
  - Proste health-check do OpenRouter (użyte przy startupie i monitoring).

- `setApiKey(newKey: string): void`
  - Bezpieczne uaktualnienie klucza w pamięci (nie zapisuj klucza do logów).

- `close(): Promise<void>`
  - Czyści zasoby (np. background retry timers) — przydatne w testach.

Publiczne pola (readonly):
- `defaultModel`, `baseUrl`, `timeoutMs`, `maxRetries` (opcjonalnie expose rate-limiter statystyki)

---

## 4. Prywatne metody i pola

Zalecane prywatne elementy (nazwy zaczynające się od `_`):

- `_httpClient` — wewnętrzny klient HTTP (fetch/axios)
- `_prepareRequestPayload(params)` — buduje payload zgodnie z OpenRouter API
- `_handleResponse(response)` — normalizuje odpowiedzi, obsługuje statusy
- `_retryWithBackoff(fn)` — retry z exponencjalnym backoff i jitter
- `_validateResponseFormatSchema(format)` — sprawdza poprawność przekazanego `response_format`
- `_applyRateLimit(key)` — wywołuje rate-limiter przed requestem
- `_maskSensitiveLogs()` — maskuje klucze i wrażliwe pola podczas logowania

Uwaga: metody prywatne powinny być testowalne (wyeksponować je lekko do testów lub używać dependency injection dla http klienta i walidatora JSON Schema).

---

## 5. Obsługa błędów

Potencjalne scenariusze błędów i rekomendowane działania:

1. Błąd uwierzytelnienia (401/403)
   - Akcja: zwróć jasno typowany błąd `AuthError` z kodem i wiadomością.
   - Retry: nie retryować — wymaga ingerencji (rotacja klucza).

2. Limit rate (429)
   - Akcja: honoruj `Retry-After` nagłówek jeśli obecny, zastosuj backoff.
   - Retry: z limitem maxRetries i exponential backoff.

3. Błędy serwera (5xx)
   - Akcja: retry z backoff (transient). Jeśli ponowne próby nie pomogą, zwróć `UpstreamError`.

4. Błędy network / timeout
   - Akcja: retry z backoff; po przekroczeniu limitu zwróć `NetworkError` z metadanymi (czas, url).

5. Niepoprawny format odpowiedzi (np. JSON niezgodny z `response_format`)
   - Akcja: waliduj schemat przyjmując opcjonalną tolerancję (lenient vs strict). W trybie `strict: true` traktuj jako `ResponseValidationError`.
   - Logowanie: zapisz skróconą wersję (no secrets), a raw payload przechowuj w bezpiecznym temp storage jeśli potrzebna diagnoza.

6. Timeout lub długi tok przetwarzania modelu
   - Akcja: skonfiguruj timeouty i eventualnie fallback do mniejszego modelu lub komunikat o opóźnieniu użytkownikowi.

7. Błędy walidacji wejścia (np. nieprawidłowy `response_format` schema)
   - Akcja: odrzuć wywołanie z `InvalidRequestError` przed wysłaniem do OpenRouter.

Każdy błąd powinien zawierać: kod (enum), krótką wiadomość, opcjonalne metadane (requestId, correlationId), oraz informację czy operacja była retryable.

---

## 6. Kwestie bezpieczeństwa

- Przechowywanie kluczy:
  - **Zmienna środowiskowa** (process.env.OPENROUTER_API_KEY) — nie commitować.
  - Jeśli używasz Vault/Supabase secrets, pobieraj klucz w runtime i rotuj regularnie.
- Logowanie:
  - Nigdy nie loguj pełnych kluczy ani wrażliwych payloadów.
  - Użyj `_maskSensitiveLogs()` przed logowaniem.
- Rate limiting & Abuse protection:
  - Implementuj rate limiter per-user i globalny rate limiter dla backendu.
- Walidacja wejścia:
  - Waliduj `response_format` i `messages` po stronie serwera.
- Uwierzytelnianie i autoryzacja:
  - Zabezpiecz endpointy, które wywołują `OpenRouterService` (np. wymóg sesji w Supabase).
- Bezpieczne debugowanie:
  - Zapisy debug payloadów tylko w bezpiecznym, ograniczonym dostępie log store (audit-only).
- CORS i CSP:
  - Frontend powinien komunikować się z własnym backendem; backend z OpenRouter.

---

## 7. Plan wdrożenia krok po kroku (dostosowany do Astro/TypeScript/Supabase stack)

Poniższy plan zakłada, że implementacja będzie w `src/lib/openrouter-service.ts` oraz że frontend wywoła backendowy endpoint API w `src/pages/api/llm.ts`.

1) Przygotowanie środowiska
   - Dodaj zmienną środowiskową `OPENROUTER_API_KEY` do lokalnego `.env` i produkcji (VPS/CI secrets).
   - Zainstaluj zależności: `npm i axios ajv p-retry p-limit` (lub użyj fetch i odpowiednich bibliotek).

2) Implementacja pliku serwisu
   - Utwórz `src/lib/openrouter-service.ts` z klasą `OpenRouterService` według specyfikacji konstruktora i public API.
   - Wstrzykuj logger i rate-limiter, domyślnie implementuj prosty in-memory p-limit dla dev i zewnętrzny rate-limiter (Redis) dla prod.

3) Walidacja schematów
   - Użyj `ajv` do kompilowania i walidowania `response_format.json_schema.schema`.
   - Przykład: jeśli użytkownik chce otrzymać strukturę `{ name: string, age: number }`, skompiluj schema i waliduj odpowiedź przed zwróceniem.

4) Endpoint HTTP
   - Stwórz `src/pages/api/llm.ts` jako proxy endpoint:
     - Autoryzacja użytkownika (Supabase session lub JWT)
     - Parsowanie request body: messages, model, response_format
     - Wywołanie `openRouterService.sendChatCompletion(...)`
     - Obsługa błędów i mapowanie na odpowiednie statusy HTTP

5) Retry/Backoff i Rate limiting
   - Implementuj retry z exponencjalnym backoff i jitter (p-retry lub własna implementacja).
   - Wdróż per-user rate limiting i globalny limit; korzystaj z Redis/Upstash w prod.

6) Observability
   - Po wdrożeniu monitoruj błędy 401/429/5xx; w razie potrzeby dostosuj rate-limity lub rotuj klucze.

---

## 8. Włączenie kluczowych elementów OpenRouter w usłudze

Poniżej przykłady i podejścia do implementacji elementów wymaganych przez OpenRouter API.

1) Komunikat systemowy (System message)

Przykład użycia w `messages`:

```json
[
  { "role": "system", "content": "You are a helpful assistant specialized in financial price history." },
  { "role": "user", "content": "Give me the price history for token X for last 30 days." }
]
```

Implementacja:
- Przyjmuj `messages` jako tablicę obiektów.
- Dołączaj globalne system messages (np. templaty) po stronie serwera przed wysłaniem do OpenRouter.

2) Komunikat użytkownika (User message)

Przekazuj bez modyfikacji, ale waliduj długość i czystość (sanity checks). Dodaj metadata (correlationId) jeśli potrzebne.

3) Ustrukturyzowane odpowiedzi poprzez `response_format` (schemat JSON)

Przykład poprawnie zdefiniowanego `response_format`:

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "person_schema",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "number" },
        "tags": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["name", "age"],
      "additionalProperties": false
    }
  }
}
```

Jak obsłużyć w serwisie:
- `OpenRouterService.sendChatCompletion` przekazuje `response_format` w payloadzie do OpenRouter.
- Po otrzymaniu odpowiedzi: jeśli `json` lub tekst zawiera JSON, parsuj go i waliduj przy użyciu `ajv`.
- W trybie `strict: true` odrzuć odpowiedź jeśli nie pasuje (zwróć `ResponseValidationError`). W trybie `strict: false` możesz próbować naprawić (np. ekstrakcja JSON z tekstu) i logować korekty.

4) Nazwa modelu (Model name)

Przykłady:
- `gpt-4o-mini`
- `claude-2` (przykład — zgodnie z wspieranymi przez OpenRouter)

Implementacja:
- Umożliw opcjonalne przesłanie `model` w wywołaniu `sendChatCompletion`.
- Jeśli brak: użyj `defaultModel` z konstruktora.

5) Parametry modelu (Model params)

Najczęstsze parametry:
- `temperature`, `top_p`, `max_tokens`, `presence_penalty`, `frequency_penalty`.

Implementacja:
- Waliduj zakresy (np. temperature 0-2), ustaw limity bezpieczeństwa (max_tokens <= 4096 lub wartość bezpieczna).
- Mapuj przyjazne nazwy na parametry wymagane przez OpenRouter API i dołącz je do payloadu.

---

## 9. Przykładowy payload request/response

Przykładowe wywołanie (skrót):

```json
POST /v1/chat/completions
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role":"system","content":"You are an assistant."},
    {"role":"user","content":"Return a JSON with {name, age}."}
  ],
  "response_format": { /* przykład powyżej */ },
  "temperature": 0.2
}
```

Odpowiedź — przykład oczekiwany (po walidacji):

```json
{
  "name": "Alice",
  "age": 30,
  "tags": ["engineer"]
}
```

Jeśli odpowiedź nie przejdzie walidacji, zwróć strukturyzowany błąd z metadanymi requestId i sugescjami (np. spróbuj parsować JSON z tekstu).

---

## 10. Podsumowanie najlepszych praktyk

- Waliduj wejście i wyjście (AJV dla schematów JSON).
- Trzymać klucze w secrets (env, Vault).
- Nie logować wrażliwych danych; maskować je.
- Implementować retry z backoff i rate limiting.
- Testy jednostkowe i integracyjne z mockami OpenRouter.
- Monitorowanie metryk i alertowanie na 401/429/5xx.

---

Plik ten zawiera kompletny przewodnik implementacyjny, zgodny ze stackiem technologicznym i wymaganiami dotyczącymi `response_format` i obsługi krytycznych błędów. W razie potrzeby mogę wygenerować szablon pliku `src/lib/openrouter-service.ts` lub przykładowy endpoint `src/pages/api/llm.ts`.
