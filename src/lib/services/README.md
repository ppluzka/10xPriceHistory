# Services - Price Monitoring System

Dokumentacja serwisów odpowiedzialnych za automatyczne monitorowanie cen ofert z Otomoto.pl.

---

## 📋 Przegląd architektury

```
┌─────────────────────────────────────────────────────────────┐
│                    CRON Trigger (pg_cron)                    │
│              Scheduled: 6h, 12h, 24h, 48h                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               OfferProcessorService                          │
│         (Main orchestrator - processBatch)                   │
└───┬──────────┬──────────┬──────────┬──────────┬────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Scraping│ │   AI   │ │Validate│ │ Price  │ │ Error  │
│Service │ │Extract │ │Service │ │History │ │Handler │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
                                      │          │
                                      ▼          ▼
                              ┌──────────────────────┐
                              │  MonitoringService   │
                              │  (Tracking & Alerts) │
                              └──────────────────────┘
```

---

## 🗂️ Lista serwisów

### Core Services

| Serwis                    | Opis                                   | Plik                         |
| ------------------------- | -------------------------------------- | ---------------------------- |
| **OfferProcessorService** | Główny orchestrator procesowania ofert | `offer-processor.service.ts` |
| **ScrapingService**       | Pobieranie i parsowanie HTML           | `scraping.service.ts`        |
| **AIExtractionService**   | AI fallback dla ekstrakcji cen         | `ai-extraction.service.ts`   |
| **ValidationService**     | Walidacja wyekstrahowanych danych      | `validation.service.ts`      |
| **PriceHistoryService**   | Zarządzanie historią cen               | `price-history.service.ts`   |
| **ErrorHandlerService**   | Obsługa błędów i retry logic           | `error-handler.service.ts`   |
| **MonitoringService**     | Monitoring systemu i alerting          | `monitoring.service.ts`      |

### Supporting Services

| Serwis                | Opis                           | Plik                       |
| --------------------- | ------------------------------ | -------------------------- |
| **OpenRouterService** | Integracja z OpenRouter.ai API | `../openrouter.service.ts` |
| **OfferService**      | CRUD operations dla ofert      | `offer.service.ts`         |
| **DashboardService**  | Dashboard data aggregation     | `dashboard.service.ts`     |

---

## 📖 Szczegółowa dokumentacja serwisów

### 1. OfferProcessorService

**Odpowiedzialności:**

- Orchestracja wszystkich serwisów w pełnym workflow
- Retry logic z exponential backoff
- Zarządzanie statusami ofert
- Batch processing (10 ofert na raz)

**Kluczowe metody:**

```typescript
class OfferProcessorService {
  // Główna metoda - pełny workflow dla 1 oferty
  async processOffer(offer: Offer, attempt = 1): Promise<void>;

  // Batch processing - przetwarza wiele ofert
  async processBatch(offers: Offer[], batchSize = 10): Promise<void>;

  // Cleanup resources
  async close(): Promise<void>;
}
```

**Workflow:**

1. Fetch HTML (ScrapingService)
2. Extract price (selector → AI fallback)
3. Validate data (ValidationService)
4. Detect anomalies (PriceHistoryService)
5. Save to DB (PriceHistoryService)
6. Track result (MonitoringService)
7. Handle errors (ErrorHandlerService)

**Reference**: Implementation Plan Section 3.4, 7.2

---

### 2. ScrapingService

**Odpowiedzialności:**

- HTTP fetch z rotacją User-Agent
- Parsing HTML (Cheerio.js)
- Ekstrakcja ceny przez CSS selector
- Delays 2-5s między requestami

**Kluczowe metody:**

```typescript
class ScrapingService {
  // Pobiera HTML z URL
  async fetchOfferPage(url: string): Promise<string>;

  // Ekstrahuje cenę używając selektora
  async extractPriceWithSelector(html: string, selector: string): Promise<ExtractedPrice | null>;

  // Sprawdza czy oferta usunięta (404/410)
  isOfferRemoved(statusCode: number): boolean;
}
```

**User-Agent Pool**: 5 różnych UA (Chrome, Firefox, Safari)

**Rate Limiting:**

- Min delay: 2s
- Max delay: 5s
- Random selection

**Reference**: Implementation Plan Section 3.1, 6.1

---

### 3. AIExtractionService

**Odpowiedzialności:**

- Fallback gdy selector nie działa
- Integracja z OpenRouter.ai
- Confidence validation (≥0.8)
- Return nowego selektora

**Kluczowe metody:**

```typescript
class AIExtractionService {
  // Ekstraktuje cenę z HTML używając AI
  async extractPriceOnly(html: string, url: string): Promise<AIExtractedPrice>;

  // Waliduje confidence score
  validateConfidence(extraction: AIExtractedPrice): boolean;

  // Cleanup
  async close(): Promise<void>;
}
```

**Model**: `openai/gpt-4o-mini` (szybki i tani)

**Optymalizacje:**

- Truncate HTML do 50KB
- Temperature: 0.1 (consistent)
- Max tokens: 200
- Structured output (JSON Schema)

**Reference**: Implementation Plan Section 3.2, 6.2

---

### 4. ValidationService

**Odpowiedzialności:**

- Walidacja zakresu cen (0, 10M)
- Walidacja typu danych
- Walidacja currency (PLN, EUR, USD, GBP)
- Confidence score validation

**Kluczowe metody:**

```typescript
class ValidationService {
  // Waliduje cenę
  validatePrice(price: number): ValidationResult;

  // Waliduje walutę
  validateCurrency(currency: string): boolean;

  // Waliduje confidence (AI)
  validateConfidenceScore(score: number): boolean;

  // Waliduje kompletne dane
  validateExtractedData(data: ExtractedPrice): ValidationResult;
}
```

**Limity:**

- Min price: >0
- Max price: <10,000,000
- Min confidence: ≥0.8
- Valid currencies: PLN, EUR, USD, GBP

**Reference**: Implementation Plan Section 3.6

---

### 5. PriceHistoryService

**Odpowiedzialności:**

- Zapisywanie cen do DB
- Update last_checked
- Detekcja anomalii (>50% change)
- Obliczanie statystyk (min, max, avg)

**Kluczowe metody:**

```typescript
class PriceHistoryService {
  // Wykrywa anomalie cenowe
  async detectPriceAnomaly(offerId: string, newPrice: number): Promise<boolean>;

  // Zapisuje wpis w historii
  async savePriceEntry(offerId: string, price: ExtractedPrice): Promise<void>;

  // Aktualizuje timestamp
  async updateLastChecked(offerId: string): Promise<void>;

  // Pobiera statystyki
  async getPriceStats(offerId: string): Promise<PriceStats>;
}
```

**Anomaly threshold**: 50% change

**Logging**: Anomalie logowane do `system_logs`

**Reference**: Implementation Plan Section 3.3

---

### 6. ErrorHandlerService

**Odpowiedzialności:**

- 3-stopniowy retry mechanism
- Zarządzanie statusami (active, error, removed)
- Logowanie błędów do `error_log`
- Decyzje o dalszym przetwarzaniu

**Kluczowe metody:**

```typescript
class ErrorHandlerService {
  // Obsługuje błąd i zwraca decyzję retry
  async handleScrapingError(offerId: string, error: Error, attempt: number): Promise<RetryDecision>;

  // Aktualizuje status oferty
  async updateOfferStatus(offerId: string, status: OfferStatus): Promise<void>;

  // Loguje błąd do bazy
  async logError(offerId: string, error: Error, attempt: number): Promise<void>;

  // Sprawdza czy retry
  shouldRetry(attempt: number): boolean;

  // Zwraca delay dla retry
  getRetryDelay(attempt: number): number;
}
```

**Retry delays:**

- Attempt 1: 1 minute
- Attempt 2: 5 minutes
- Attempt 3: 15 minutes

**After 3 attempts**: Status → `error`

**Reference**: Implementation Plan Section 3.4, 7

---

### 7. MonitoringService

**Odpowiedzialności:**

- Tracking success rate (24h)
- Obliczanie error rate
- Wysyłanie alertów (>15% errors)
- Metrics do `system_logs`

**Kluczowe metody:**

```typescript
class MonitoringService {
  // Loguje wynik sprawdzenia
  async trackCheckResult(offerId: string, success: boolean): Promise<void>;

  // Oblicza success rate
  async calculateSuccessRate(periodHours: number): Promise<number>;

  // Pobiera system health
  async getSystemHealth(): Promise<SystemHealth>;

  // Sprawdza i wysyła alert
  async checkAndSendAlert(): Promise<void>;
}
```

**Alert threshold**: >15% error rate

**Cooldown**: 6 godzin (zapobiega spamowaniu)

**Webhook**: Slack/Discord compatible

**Reference**: Implementation Plan Section 3.5, 10

---

## 🔄 Przepływ danych (Happy Path)

```
1. CRON trigger
   ↓
2. OfferProcessorService.processBatch()
   ↓
3. For each offer:
   ├─ ScrapingService.fetchOfferPage()
   ├─ ScrapingService.extractPriceWithSelector()
   │  │
   │  └─ IF FAILS → AIExtractionService.extractPriceOnly()
   │                 └─ Update selector in DB
   ↓
4. ValidationService.validateExtractedData()
   ↓
5. PriceHistoryService.detectPriceAnomaly()
   ↓
6. PriceHistoryService.savePriceEntry()
   ↓
7. PriceHistoryService.updateLastChecked()
   ↓
8. MonitoringService.trackCheckResult(success: true)
   ↓
9. Next offer...
```

---

## ❌ Przepływ błędów

```
1. Error occurs during processing
   ↓
2. ErrorHandlerService.handleScrapingError()
   ↓
3. Check if 404/410 (removed)
   ├─ YES → Status: 'removed', END
   └─ NO → Continue
   ↓
4. ErrorHandlerService.shouldRetry(attempt)
   ├─ YES (attempt < 3)
   │  ├─ Log error to error_log
   │  ├─ Get retry delay
   │  ├─ Wait delay
   │  └─ Retry from step 1 (attempt++)
   │
   └─ NO (attempt >= 3)
      ├─ Status: 'error'
      ├─ MonitoringService.trackCheckResult(success: false)
      └─ END
```

---

## 🧪 Testing

### Unit Tests (vitest)

```bash
# Run all tests
npm run test

# Run specific service tests
npm run test scraping.service.test.ts
npm run test validation.service.test.ts
```

### Integration Tests

```typescript
// Example test
describe("OfferProcessorService", () => {
  it("should process offer successfully", async () => {
    const processor = new OfferProcessorService(mockSupabase, mockApiKey);
    await processor.processOffer(mockOffer);
    // Assert price saved, status updated, etc.
  });
});
```

### E2E Tests (Playwright)

```typescript
// Test manual recheck in UI
test("should recheck offer with error status", async ({ page }) => {
  await page.goto("/dashboard");
  await page.click('[data-testid="offer-card-recheck-button"]');
  await expect(page.locator(".toast-success")).toBeVisible();
});
```

---

## 📊 Metryki i monitoring

### Kluczowe metryki:

| Metryka           | Target | Query                      |
| ----------------- | ------ | -------------------------- |
| Success Rate      | ≥90%   | `calculateSuccessRate(24)` |
| AI Fallback Rate  | <20%   | Count AI usage in logs     |
| Avg Response Time | <5s    | Time per offer             |
| Error Count       | <15%   | Count failed checks        |
| Active Offers     | N/A    | Count status='active'      |

### Monitoring queries:

```sql
-- Success rate
SELECT
  ROUND(
    COUNT(CASE WHEN event_type = 'price_check_success' THEN 1 END)::NUMERIC /
    COUNT(*)::NUMERIC * 100,
    2
  ) as success_rate
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND event_type IN ('price_check_success', 'price_check_failed');

-- Top errors
SELECT error_message, COUNT(*) as count
FROM error_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;
```

---

## 🔧 Development

### Dodawanie nowego serwisu:

1. Utwórz plik w `src/lib/services/`
2. Zdefiniuj interface w `src/types.ts`
3. Implementuj serwis z JSDoc
4. Dodaj testy w `__tests__/`
5. Zintegruj w `OfferProcessorService`
6. Zaktualizuj dokumentację

### Coding standards:

- ✅ TypeScript strict mode
- ✅ JSDoc dla wszystkich public methods
- ✅ Error handling na początku funkcji
- ✅ Early returns dla guard clauses
- ✅ Dependency injection (SupabaseClient)
- ✅ Single responsibility principle

---

## 📚 Dodatkowe zasoby

- **Implementation Plan**: `.ai/price-monitoring-implementation-plan.md`
- **Setup Guide**: `.ai/price-monitoring-setup.md`
- **API Docs**: `.ai/api-monitoring-endpoints.md`
- **Quick Start**: `.ai/QUICK_START_MONITORING.md`

---

**Ostatnia aktualizacja**: 2025-11-04
