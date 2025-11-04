# Implementation Plan: Automatyczne Monitorowanie Cen Ofert

## 1. Przegląd mechanizmu

Mechanizm automatycznego monitorowania cen to system cyklicznego sprawdzania aktualnych cen ofert z Otomoto.pl w celu budowania historii cenowej. System wykorzystuje scheduled job (pg_cron), który w regularnych odstępach pobiera aktywne oferty, ekstrahuje z nich ceny przy użyciu zapisanych selektorów CSS/XPath, waliduje dane i zapisuje je w historii. W przypadku niepowodzenia ekstrakcji, system wykorzystuje AI (OpenRouter.ai) jako fallback. Mechanizm zawiera zaawansowaną obsługę błędów z 3-stopniowym systemem retry oraz automatyczne zarządzanie statusami ofert (active, error, removed).

**Cel biznesowy**: Utrzymanie aktualnej historii cen dla wszystkich aktywnych ofert z minimalną interwencją użytkownika i osiągnięcie KPI 90% skuteczności pobierania danych.

## 2. Architektura systemu

```
┌─────────────────────────────────────────────────────────────────┐
│                         pg_cron Scheduler                        │
│           (Multiple schedules: 6h, 12h, 24h, 48h)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  check_offer_prices() Function                   │
│              (Fetch active offers from database)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ScrapingService                              │
│  • HTTP Fetch (User-Agent rotation, delays 2-5s)               │
│  • Cheerio HTML parsing                                         │
│  • Selector-based extraction (CSS/XPath)                        │
└────────────┬────────────────────────┬─────────────────────────┘
             │ Success                 │ Failure
             ▼                         ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│ ValidationService    │    │   AIExtractionService         │
│ • Price range check  │    │ • OpenRouter.ai integration   │
│ • Type validation    │    │ • Confidence score ≥0.8       │
│ • Anomaly detection  │    │ • Structured JSON response    │
└──────────┬───────────┘    └──────────┬───────────────────┘
           │ Valid                      │
           │                            ▼
           │                  ┌──────────────────────┐
           │                  │  ValidationService   │
           │                  │  (Same validation)   │
           │                  └──────────┬───────────┘
           │                             │ Valid
           │                             │
           └─────────────┬───────────────┘
                         │ Invalid
                         ▼
           ┌──────────────────────────────┐
           │    ErrorHandlerService        │
           │ • Retry mechanism (3x)        │
           │ • Status management           │
           │ • Error logging               │
           └──────────┬───────────────────┘
                      │
           ┌──────────┴──────────┐
           │ Success              │ Failure after retries
           ▼                      ▼
┌────────────────────┐    ┌──────────────────────┐
│ PriceHistoryService│    │ Update offer status  │
│ • Save to DB       │    │ • error / removed    │
│ • Update timestamp │    │ • Log to error_log   │
└────────────────────┘    └──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MonitoringService                            │
│  • Success rate tracking                                        │
│  • Alert when error rate >15%                                   │
│  • System health metrics                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Komponenty i odpowiedzialności

### 3.1 ScrapingService (`src/lib/services/scraping.service.ts`)

**Odpowiedzialności:**
- Pobieranie HTML z URL oferty z rotacją User-Agent
- Parsowanie HTML przy użyciu Cheerio.js
- Ekstrakcja ceny za pomocą zapisanego selektora CSS/XPath
- Implementacja opóźnień 2-5s między requestami
- Obsługa HTTP errors (404, 410, timeout, etc.)

**Interfejs publiczny:**
```typescript
interface ScrapingService {
  fetchOfferPage(url: string): Promise<string>; // Returns HTML
  extractPriceWithSelector(html: string, selector: string): Promise<ExtractedPrice | null>;
  isOfferRemoved(statusCode: number): boolean; // Check for 404/410
}

interface ExtractedPrice {
  price: number;
  currency: string;
  rawValue: string;
}
```

### 3.2 AIExtractionService (`src/lib/services/ai-extraction.service.ts`)

**Odpowiedzialności:**
- Integracja z OpenRouter.ai (wykorzystanie istniejącej implementacji)
- Ekstrakcja ceny z HTML gdy selector zawodzi
- Walidacja confidence score (≥0.8)
- Optymalizacja kosztów poprzez inteligentny fallback

**Interfejs publiczny:**
```typescript
interface AIExtractionService {
  extractOfferData(html: string, url: string): Promise<LLMExtractionResponse>;
  validateConfidence(response: LLMExtractionResponse): boolean;
}
```

**Uwaga**: Ten serwis już częściowo istnieje - należy go rozszerzyć o price-only extraction mode.

### 3.3 PriceHistoryService (`src/lib/services/price-history.service.ts`)

**Odpowiedzialności:**
- Zapisywanie cen do tabeli `price_history`
- Walidacja poprawności ceny (zakres, typ)
- Aktualizacja `offers.last_checked`
- Detekcja anomalii cenowych (>50% zmiana)
- Obliczanie statystyk (min, max, avg)

**Interfejs publiczny:**
```typescript
interface PriceHistoryService {
  savePriceEntry(offerId: string, price: ExtractedPrice): Promise<void>;
  updateLastChecked(offerId: string): Promise<void>;
  detectPriceAnomaly(offerId: string, newPrice: number): Promise<boolean>;
  getPriceStats(offerId: string): Promise<PriceStats>;
}

interface PriceStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}
```

### 3.4 ErrorHandlerService (`src/lib/services/error-handler.service.ts`)

**Odpowiedzialności:**
- Implementacja mechanizmu retry z rosnącym interwałem
- Zarządzanie statusami ofert (active → error/removed)
- Logowanie błędów do `error_log`
- Tracking liczby prób dla każdej oferty
- Decyzje o dalszym przetwarzaniu oferty

**Interfejs publiczny:**
```typescript
interface ErrorHandlerService {
  handleScrapingError(
    offerId: string,
    error: Error,
    attempt: number
  ): Promise<RetryDecision>;
  updateOfferStatus(offerId: string, status: OfferStatus): Promise<void>;
  logError(offerId: string, error: Error, attempt: number): Promise<void>;
  shouldRetry(attempt: number): boolean;
  getRetryDelay(attempt: number): number; // Returns ms: 60000, 300000, 900000
}

interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  nextAttempt: number;
}

enum OfferStatus {
  ACTIVE = 'active',
  ERROR = 'error',
  REMOVED = 'removed'
}
```

### 3.5 MonitoringService (`src/lib/services/monitoring.service.ts`)

**Odpowiedzialności:**
- Tracking success rate dla ostatnich 24h
- Obliczanie error rate
- Wysyłanie alertów gdy error rate >15%
- Logowanie metryk do `system_logs`
- Rate limiting dla alertów (max 1 alert/6h)

**Interfejs publiczny:**
```typescript
interface MonitoringService {
  trackCheckResult(offerId: string, success: boolean): Promise<void>;
  calculateSuccessRate(periodHours: number): Promise<number>;
  checkAndSendAlert(): Promise<void>;
  getSystemHealth(): Promise<SystemHealth>;
}

interface SystemHealth {
  successRate: number;
  totalChecks: number;
  errorCount: number;
  activeOffers: number;
  lastAlertSent: Date | null;
}
```

### 3.6 ValidationService (`src/lib/services/validation.service.ts`)

**Odpowiedzialności:**
- Walidacja zakresu ceny (>0 && <10,000,000)
- Walidacja typu danych (number)
- Walidacja currency (PLN, EUR, USD, GBP)
- Walidacja confidence score dla AI (≥0.8)
- Wykrywanie podejrzanych wartości

**Interfejs publiczny:**
```typescript
interface ValidationService {
  validatePrice(price: number): ValidationResult;
  validateCurrency(currency: string): boolean;
  validateConfidenceScore(score: number): boolean;
  validateExtractedData(data: ExtractedPrice): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

## 4. Przepływ danych

### 4.1 Szczegółowy przepływ główny (Happy Path)

```
1. pg_cron trigger → Uruchomienie check_offer_prices()
   ↓
2. Pobranie ofert: SELECT * FROM offers 
   WHERE status = 'active' AND deleted_at IS NULL
   ↓
3. Dla każdej oferty:
   ├─ 3a. ScrapingService.fetchOfferPage(url)
   │      • Wybór losowego User-Agent z puli
   │      • HTTP GET request z timeout 30s
   │      • Random delay 2-5s przed następnym requestem
   │      • Return HTML string
   ↓
   ├─ 3b. ScrapingService.extractPriceWithSelector(html, selector)
   │      • Parse HTML z Cheerio
   │      • Apply selector (CSS lub XPath)
   │      • Extract text content
   │      • Parse price (remove whitespace, currency symbols)
   │      • Return ExtractedPrice | null
   ↓
   ├─ 3c. IF extraction successful:
   │      ├─ ValidationService.validateExtractedData(price)
   │      │  • Check price range (0, 10M)
   │      │  • Check currency format
   │      │  • Return ValidationResult
   │      ↓
   │      └─ IF valid:
   │         ├─ PriceHistoryService.detectPriceAnomaly(offerId, price)
   │         │  • Get last price from DB
   │         │  • Calculate % change
   │         │  • Log warning if >50% change
   │         ↓
   │         ├─ PriceHistoryService.savePriceEntry(offerId, price)
   │         │  • INSERT INTO price_history
   │         ↓
   │         ├─ PriceHistoryService.updateLastChecked(offerId)
   │         │  • UPDATE offers SET last_checked = NOW()
   │         ↓
   │         └─ MonitoringService.trackCheckResult(offerId, true)
   │            • Log success to system_logs
   ↓
   ├─ 3d. IF extraction failed (null):
   │      ├─ AIExtractionService.extractOfferData(html, url)
   │      │  • Send HTML to OpenRouter.ai
   │      │  • Request structured JSON response
   │      │  • Parse LLMExtractionResponse
   │      ↓
   │      ├─ AIExtractionService.validateConfidence(response)
   │      │  • Check confidence ≥0.8
   │      ↓
   │      └─ IF confidence valid:
   │         ├─ Update selector in DB (offers.selector = response.selector)
   │         └─ Continue as in step 3c (validation → save)
   │      ELSE:
   │         └─ Go to Error Handling (step 3e)
   ↓
   └─ 3e. Error Handling:
      ├─ ErrorHandlerService.handleScrapingError(offerId, error, attempt)
      │  • Check current attempt number
      │  • Determine if should retry
      ↓
      ├─ IF shouldRetry (attempt < 3):
      │  ├─ ErrorHandlerService.getRetryDelay(attempt)
      │  │  • attempt 1: 60000ms (1 min)
      │  │  • attempt 2: 300000ms (5 min)
      │  │  • attempt 3: 900000ms (15 min)
      │  ↓
      │  ├─ Wait for delay
      │  ↓
      │  └─ Retry from step 3a with attempt++
      ↓
      └─ IF !shouldRetry (attempt ≥ 3):
         ├─ ErrorHandlerService.logError(offerId, error, attempt)
         │  • INSERT INTO error_log
         ↓
         ├─ ErrorHandlerService.updateOfferStatus(offerId, 'error')
         │  • UPDATE offers SET status = 'error'
         ↓
         └─ MonitoringService.trackCheckResult(offerId, false)
            • Log failure to system_logs

4. Po przetworzeniu wszystkich ofert:
   ↓
   ├─ MonitoringService.calculateSuccessRate(24)
   │  • Count successful checks in last 24h
   │  • Calculate: (success / total) * 100
   ↓
   └─ MonitoringService.checkAndSendAlert()
      • IF error_rate > 15% AND last_alert > 6h ago:
        └─ Send alert (email/webhook)
```

### 4.2 Przepływ dla usuniętej oferty (404/410)

```
1. ScrapingService.fetchOfferPage(url) throws HTTP 404/410
   ↓
2. ScrapingService.isOfferRemoved(statusCode) returns true
   ↓
3. ErrorHandlerService.updateOfferStatus(offerId, 'removed')
   • UPDATE offers SET status = 'removed'
   ↓
4. Skip retry mechanism (oferta nie będzie sprawdzana w przyszłości)
   ↓
5. MonitoringService.trackCheckResult(offerId, false)
   • Log as "removed" in system_logs
```

## 5. Scheduled Job Configuration

### 5.1 pg_cron Setup w Supabase

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to check offer prices
CREATE OR REPLACE FUNCTION check_offer_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call external API endpoint to trigger price checking
  -- Using pg_net extension for HTTP requests
  PERFORM
    net.http_post(
      url := 'https://your-domain.com/api/cron/check-prices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret')
      ),
      body := jsonb_build_object('triggered_by', 'pg_cron')
    );
END;
$$;

-- Schedule jobs for different frequencies
-- Every 6 hours
SELECT cron.schedule(
  'check_prices_6h',
  '0 */6 * * *',
  $$SELECT check_offer_prices()$$
);

-- Every 12 hours
SELECT cron.schedule(
  'check_prices_12h',
  '0 */12 * * *',
  $$SELECT check_offer_prices()$$
);

-- Every 24 hours (default)
SELECT cron.schedule(
  'check_prices_24h',
  '0 0 * * *',
  $$SELECT check_offer_prices()$$
);

-- Every 48 hours
SELECT cron.schedule(
  'check_prices_48h',
  '0 0 */2 * *',
  $$SELECT check_offer_prices()$$
);
```

### 5.2 API Endpoint Configuration (`src/pages/api/cron/check-prices.ts`)

```typescript
// Endpoint wywoływany przez pg_cron
export const POST = async ({ request, locals }: APIContext) => {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    });
  }

  // Get active offers
  const { data: offers, error } = await locals.supabase
    .from('offers')
    .select('*')
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error || !offers) {
    return new Response(JSON.stringify({ error: 'Failed to fetch offers' }), {
      status: 500
    });
  }

  // Process offers in batches
  const batchSize = 10;
  for (let i = 0; i < offers.length; i += batchSize) {
    const batch = offers.slice(i, i + batchSize);
    await Promise.all(
      batch.map(offer => processOffer(offer, locals.supabase))
    );
    
    // Delay between batches
    await delay(5000); // 5s between batches
  }

  // Check system health and send alerts if needed
  const monitoringService = new MonitoringService(locals.supabase);
  await monitoringService.checkAndSendAlert();

  return new Response(JSON.stringify({ 
    success: true, 
    processed: offers.length 
  }), {
    status: 200
  });
};
```

### 5.3 Frequency Management

Częstotliwość sprawdzania jest zarządzana na poziomie użytkownika poprzez `user_preferences.default_frequency`. W fazie MVP wszystkie oferty użytkownika dziedziczą jego globalną częstotliwość.

```typescript
// W przyszłości: per-offer frequency
// Filtrowanie ofert na podstawie częstotliwości
function shouldCheckOffer(offer: Offer, frequency: Frequency): boolean {
  const hoursSinceLastCheck = 
    (Date.now() - new Date(offer.last_checked).getTime()) / (1000 * 60 * 60);
  
  const frequencyHours = {
    '6h': 6,
    '12h': 12,
    '24h': 24,
    '48h': 48
  };
  
  return hoursSinceLastCheck >= frequencyHours[frequency];
}
```

## 6. Strategia scrapingu i ekstrakcji

### 6.1 Scraping Configuration

```typescript
// src/lib/services/scraping.service.ts

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const SCRAPING_CONFIG = {
  timeout: 30000, // 30s
  minDelay: 2000, // 2s
  maxDelay: 5000, // 5s
  maxRetries: 3,
  retryDelays: [60000, 300000, 900000] // 1min, 5min, 15min
};

export class ScrapingService {
  private async getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRandomDelay(): number {
    return Math.floor(
      Math.random() * (SCRAPING_CONFIG.maxDelay - SCRAPING_CONFIG.minDelay) +
      SCRAPING_CONFIG.minDelay
    );
  }

  async fetchOfferPage(url: string): Promise<string> {
    const userAgent = await this.getRandomUserAgent();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        SCRAPING_CONFIG.timeout
      );

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Add delay before next request
      await this.delay(this.getRandomDelay());

      return await response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async extractPriceWithSelector(
    html: string,
    selector: string
  ): Promise<ExtractedPrice | null> {
    const $ = cheerio.load(html);
    const element = $(selector);

    if (!element.length) {
      return null;
    }

    const rawValue = element.text().trim();
    const priceMatch = rawValue.match(/[\d\s]+/);
    
    if (!priceMatch) {
      return null;
    }

    const priceString = priceMatch[0].replace(/\s/g, '');
    const price = parseFloat(priceString);

    if (isNaN(price)) {
      return null;
    }

    // Extract currency
    const currencyMatch = rawValue.match(/PLN|EUR|USD|GBP/);
    const currency = currencyMatch ? currencyMatch[0] : 'PLN';

    return {
      price,
      currency,
      rawValue
    };
  }

  isOfferRemoved(statusCode: number): boolean {
    return statusCode === 404 || statusCode === 410;
  }
}
```

### 6.2 AI Fallback Integration

```typescript
// src/lib/services/ai-extraction.service.ts

export class AIExtractionService {
  private openRouterService: OpenRouterService;

  constructor() {
    this.openRouterService = new OpenRouterService(
      import.meta.env.OPENROUTER_API_KEY
    );
  }

  async extractPriceOnly(html: string, url: string): Promise<AIExtractedPrice> {
    const systemPrompt = `You are a web scraping expert. Extract ONLY the price information from Otomoto.pl offer HTML.
Return a JSON object with:
- price: number (just the number, no currency symbols)
- currency: string (PLN, EUR, USD, or GBP)
- confidence: number (0-1, how confident you are)
- selector: string (CSS selector that can be used to extract this price in the future)

If you cannot find the price, return confidence: 0.`;

    const userPrompt = `Extract the price from this Otomoto.pl offer page:
URL: ${url}

HTML (truncated to first 50KB):
${html.substring(0, 50000)}`;

    const response = await this.openRouterService.sendChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'openai/gpt-4o-mini', // Fast and cheap
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'price_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              currency: { type: 'string', enum: ['PLN', 'EUR', 'USD', 'GBP'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              selector: { type: 'string' }
            },
            required: ['price', 'currency', 'confidence', 'selector'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 200
    });

    return JSON.parse(response.data) as AIExtractedPrice;
  }

  validateConfidence(extraction: AIExtractedPrice): boolean {
    return extraction.confidence >= 0.8;
  }
}

interface AIExtractedPrice {
  price: number;
  currency: string;
  confidence: number;
  selector: string;
}
```

### 6.3 Selector Update Strategy

Gdy AI pomyślnie ekstrahuje cenę i zwraca nowy selector, system powinien zaktualizować go w bazie:

```typescript
async function updateOfferSelector(
  offerId: string,
  newSelector: string,
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from('offers')
    .update({ selector: newSelector })
    .eq('id', offerId);
}
```

## 7. Mechanizm retry i obsługa błędów

### 7.1 Retry Logic Implementation

```typescript
// src/lib/services/error-handler.service.ts

export class ErrorHandlerService {
  private supabase: SupabaseClient;
  
  private readonly RETRY_DELAYS = {
    1: 60000,    // 1 minute
    2: 300000,   // 5 minutes
    3: 900000    // 15 minutes
  };

  private readonly MAX_ATTEMPTS = 3;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.MAX_ATTEMPTS;
  }

  getRetryDelay(attempt: number): number {
    return this.RETRY_DELAYS[attempt as keyof typeof this.RETRY_DELAYS] || 0;
  }

  async handleScrapingError(
    offerId: string,
    error: Error,
    attempt: number
  ): Promise<RetryDecision> {
    // Log the error
    await this.logError(offerId, error, attempt);

    // Check if we should retry
    if (this.shouldRetry(attempt)) {
      const nextAttempt = attempt + 1;
      const delayMs = this.getRetryDelay(nextAttempt);
      
      return {
        shouldRetry: true,
        delayMs,
        nextAttempt
      };
    }

    // Max attempts reached - mark as error
    await this.updateOfferStatus(offerId, 'error');
    
    return {
      shouldRetry: false,
      delayMs: 0,
      nextAttempt: 0
    };
  }

  async updateOfferStatus(
    offerId: string,
    status: 'active' | 'error' | 'removed'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('offers')
      .update({ status })
      .eq('id', offerId);

    if (error) {
      console.error(`Failed to update offer status: ${error.message}`);
      throw error;
    }
  }

  async logError(
    offerId: string,
    error: Error,
    attempt: number
  ): Promise<void> {
    const { error: insertError } = await this.supabase
      .from('error_log')
      .insert({
        offer_id: offerId,
        error_message: error.message,
        error_stack: error.stack,
        attempt_number: attempt,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error(`Failed to log error: ${insertError.message}`);
    }
  }
}
```

### 7.2 Retry Orchestration

```typescript
// Main processing function with retry logic
async function processOffer(
  offer: Offer,
  supabase: SupabaseClient,
  attempt: number = 1
): Promise<void> {
  const scrapingService = new ScrapingService();
  const aiExtractionService = new AIExtractionService();
  const validationService = new ValidationService();
  const priceHistoryService = new PriceHistoryService(supabase);
  const errorHandlerService = new ErrorHandlerService(supabase);
  const monitoringService = new MonitoringService(supabase);

  try {
    // Step 1: Fetch HTML
    const html = await scrapingService.fetchOfferPage(offer.url);

    // Step 2: Try selector-based extraction
    let extractedPrice = await scrapingService.extractPriceWithSelector(
      html,
      offer.selector
    );

    // Step 3: Fallback to AI if selector failed
    if (!extractedPrice) {
      const aiExtraction = await aiExtractionService.extractPriceOnly(
        html,
        offer.url
      );

      if (!aiExtractionService.validateConfidence(aiExtraction)) {
        throw new Error('Low confidence AI extraction');
      }

      extractedPrice = {
        price: aiExtraction.price,
        currency: aiExtraction.currency,
        rawValue: `${aiExtraction.price} ${aiExtraction.currency}`
      };

      // Update selector for future use
      await updateOfferSelector(offer.id, aiExtraction.selector, supabase);
    }

    // Step 4: Validate extracted price
    const validation = validationService.validateExtractedData(extractedPrice);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 5: Check for anomalies
    const isAnomaly = await priceHistoryService.detectPriceAnomaly(
      offer.id,
      extractedPrice.price
    );
    if (isAnomaly) {
      console.warn(`Price anomaly detected for offer ${offer.id}`);
      // Log but continue processing
    }

    // Step 6: Save to price history
    await priceHistoryService.savePriceEntry(offer.id, extractedPrice);
    await priceHistoryService.updateLastChecked(offer.id);

    // Step 7: Track success
    await monitoringService.trackCheckResult(offer.id, true);

  } catch (error) {
    // Check if offer was removed (404/410)
    if (error.message.includes('HTTP 404') || error.message.includes('HTTP 410')) {
      await errorHandlerService.updateOfferStatus(offer.id, 'removed');
      await monitoringService.trackCheckResult(offer.id, false);
      return;
    }

    // Handle other errors with retry logic
    const retryDecision = await errorHandlerService.handleScrapingError(
      offer.id,
      error,
      attempt
    );

    if (retryDecision.shouldRetry) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDecision.delayMs));
      
      // Retry
      await processOffer(offer, supabase, retryDecision.nextAttempt);
    } else {
      // Max retries reached
      await monitoringService.trackCheckResult(offer.id, false);
    }
  }
}
```

## 8. Zarządzanie statusami ofert

### 8.1 Status Transitions

```
┌─────────┐
│ ACTIVE  │◄────────────┐
└────┬────┘             │
     │                  │
     │ Scraping fails   │ Manual
     │ after 3 retries  │ reactivation
     │                  │
     ▼                  │
┌─────────┐             │
│  ERROR  │─────────────┘
└─────────┘

┌─────────┐
│ ACTIVE  │
└────┬────┘
     │
     │ HTTP 404/410
     │ detected
     │
     ▼
┌─────────┐
│ REMOVED │ (terminal state)
└─────────┘
```

### 8.2 Status Management Rules

1. **ACTIVE** → **ERROR**
   - Trigger: 3 nieudane próby ekstrakcji ceny
   - Action: Przestań sprawdzać w kolejnych cyklach
   - User action: Może ręcznie reaktywować (powrót do ACTIVE)

2. **ACTIVE** → **REMOVED**
   - Trigger: HTTP 404 lub 410 response
   - Action: Przestań sprawdzać permanentnie
   - User action: Może usunąć ofertę z listy (soft delete)

3. **ERROR** → **ACTIVE**
   - Trigger: Użytkownik kliknie "Reaktywuj" lub "Sprawdź ponownie"
   - Action: Oferta wraca do puli sprawdzanych ofert

4. **REMOVED**: Status terminalny
   - User może tylko usunąć ofertę z listy
   - Nie można reaktywować (oferta nie istnieje już na Otomoto)

### 8.3 Filtering Active Offers

```sql
-- Query używane przez cron job
SELECT *
FROM offers
WHERE status = 'active'
  AND deleted_at IS NULL
  AND (
    last_checked IS NULL 
    OR last_checked < NOW() - INTERVAL '1 hour' * frequency_hours
  );
```

### 8.4 Status Display in UI

```typescript
// Badge component dla różnych statusów
function getStatusBadge(status: OfferStatus) {
  const badges = {
    active: {
      label: 'Aktywna',
      color: 'green',
      icon: '✓'
    },
    error: {
      label: 'Błąd sprawdzania',
      color: 'red',
      icon: '⚠'
    },
    removed: {
      label: 'Oferta usunięta',
      color: 'gray',
      icon: '✕'
    }
  };

  return badges[status];
}
```

## 9. Względy bezpieczeństwa

### 9.1 Rate Limiting Strategy

```typescript
// Rate limiter per domain
class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private readonly maxRequestsPerMinute = 10;
  private readonly maxRequestsPerHour = 200;

  async checkRateLimit(domain: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requestCounts.get(domain) || [];
    
    // Remove requests older than 1 hour
    const recentRequests = requests.filter(time => now - time < 3600000);
    
    // Check limits
    const requestsLastMinute = recentRequests.filter(
      time => now - time < 60000
    ).length;
    
    if (requestsLastMinute >= this.maxRequestsPerMinute) {
      return false;
    }
    
    if (recentRequests.length >= this.maxRequestsPerHour) {
      return false;
    }
    
    // Update counts
    recentRequests.push(now);
    this.requestCounts.set(domain, recentRequests);
    
    return true;
  }
}
```

### 9.2 Security Best Practices

1. **User-Agent Rotation**
   - Pool 5-10 różnych User-Agents
   - Losowy wybór dla każdego requesta
   - Regularne aktualizacje puli (nowe wersje przeglądarek)

2. **Request Delays**
   - Random delay 2-5s między requestami
   - Większe opóźnienia dla batch processing
   - Respect dla scheduled maintenance windows

3. **Headers Configuration**
   - Accept-Language: pl-PL (naturalne dla Otomoto.pl)
   - Accept-Encoding: gzip, deflate, br
   - Connection: keep-alive
   - Referer: https://www.otomoto.pl/ (optional)

4. **Error Handling**
   - Graceful handling 429 (Too Many Requests)
   - Exponential backoff przy rate limiting
   - Respect Retry-After header

5. **IP Rotation (Future Enhancement)**
   - Proxy pool dla większej skali
   - Residential proxies dla lepszego success rate
   - Rotation strategy per domain

6. **robots.txt Compliance**
   - Check robots.txt before scraping
   - Respect Crawl-delay directive
   - Avoid disallowed paths

```typescript
// robots.txt parser
async function checkRobotsTxt(url: string): Promise<boolean> {
  const urlObj = new URL(url);
  const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
  
  try {
    const response = await fetch(robotsUrl);
    const robotsTxt = await response.text();
    
    // Parse and check if our path is allowed
    // Implementation details...
    
    return true; // Allowed
  } catch (error) {
    // If robots.txt doesn't exist, assume allowed
    return true;
  }
}
```

### 9.3 CRON Endpoint Security

```typescript
// Verify cron secret
export const POST = async ({ request, locals }: APIContext) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Additional security: Check IP whitelist if needed
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip');
  
  // Process...
};
```

## 10. Monitoring i logging

### 10.1 System Logs Structure

```sql
-- system_logs table (if not exists)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id),
  event_type VARCHAR(50) NOT NULL, -- 'price_check_success', 'price_check_failed', etc.
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- error_log table (if not exists)
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  attempt_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.2 Monitoring Service Implementation

```typescript
// src/lib/services/monitoring.service.ts

export class MonitoringService {
  private supabase: SupabaseClient;
  private readonly ERROR_THRESHOLD = 0.15; // 15%
  private readonly ALERT_COOLDOWN_HOURS = 6;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async trackCheckResult(offerId: string, success: boolean): Promise<void> {
    await this.supabase.from('system_logs').insert({
      offer_id: offerId,
      event_type: success ? 'price_check_success' : 'price_check_failed',
      message: success ? 'Price successfully checked' : 'Price check failed',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  async calculateSuccessRate(periodHours: number): Promise<number> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - periodHours);

    const { data: logs, error } = await this.supabase
      .from('system_logs')
      .select('event_type')
      .gte('created_at', startTime.toISOString())
      .in('event_type', ['price_check_success', 'price_check_failed']);

    if (error || !logs || logs.length === 0) {
      return 100; // No data = assume healthy
    }

    const successCount = logs.filter(
      log => log.event_type === 'price_check_success'
    ).length;
    
    const totalCount = logs.length;
    
    return (successCount / totalCount) * 100;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const successRate = await this.calculateSuccessRate(24);
    
    const { data: logs } = await this.supabase
      .from('system_logs')
      .select('event_type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const totalChecks = logs?.length || 0;
    const errorCount = logs?.filter(
      log => log.event_type === 'price_check_failed'
    ).length || 0;

    const { count: activeOffers } = await this.supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: lastAlert } = await this.supabase
      .from('system_logs')
      .select('created_at')
      .eq('event_type', 'alert_sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      successRate,
      totalChecks,
      errorCount,
      activeOffers: activeOffers || 0,
      lastAlertSent: lastAlert ? new Date(lastAlert.created_at) : null
    };
  }

  async checkAndSendAlert(): Promise<void> {
    const health = await this.getSystemHealth();
    const errorRate = 100 - health.successRate;

    // Check if error rate exceeds threshold
    if (errorRate <= this.ERROR_THRESHOLD * 100) {
      return; // System healthy
    }

    // Check cooldown period
    if (health.lastAlertSent) {
      const hoursSinceLastAlert = 
        (Date.now() - health.lastAlertSent.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastAlert < this.ALERT_COOLDOWN_HOURS) {
        return; // Still in cooldown
      }
    }

    // Send alert
    await this.sendAlert(health);

    // Log alert sent
    await this.supabase.from('system_logs').insert({
      event_type: 'alert_sent',
      message: `High error rate detected: ${errorRate.toFixed(2)}%`,
      metadata: {
        health,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async sendAlert(health: SystemHealth): Promise<void> {
    const alertMessage = {
      title: '🚨 High Error Rate Alert',
      timestamp: new Date().toISOString(),
      successRate: `${health.successRate.toFixed(2)}%`,
      errorRate: `${(100 - health.successRate).toFixed(2)}%`,
      totalChecks: health.totalChecks,
      errorCount: health.errorCount,
      activeOffers: health.activeOffers
    };

    // Option 1: Email via Supabase Edge Function
    // await this.sendEmailAlert(alertMessage);

    // Option 2: Webhook (Slack, Discord, etc.)
    await this.sendWebhookAlert(alertMessage);

    // Option 3: Log to external service (Sentry, etc.)
    // await this.sendToMonitoringService(alertMessage);
  }

  private async sendWebhookAlert(message: any): Promise<void> {
    const webhookUrl = import.meta.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('No webhook URL configured for alerts');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }
}
```

### 10.3 Logging Best Practices

1. **Structured Logging**
   - Use JSON metadata field dla kontekstu
   - Standardize event_type values
   - Include timestamps, offer_id, user_id where applicable

2. **Log Levels**
   - INFO: Successful operations
   - WARN: Anomalies, rate limiting
   - ERROR: Failed operations, exceptions

3. **Log Retention**
   - system_logs: 30 days
   - error_log: 90 days
   - Archive older logs for compliance

4. **Performance Monitoring**
   - Track average scraping time
   - Monitor AI API latency
   - Database query performance

## 11. Walidacja i kontrola jakości

### 11.1 Validation Service Implementation

```typescript
// src/lib/services/validation.service.ts

export class ValidationService {
  private readonly MIN_PRICE = 0;
  private readonly MAX_PRICE = 10000000;
  private readonly MIN_CONFIDENCE = 0.8;
  private readonly VALID_CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'];

  validatePrice(price: number): ValidationResult {
    const errors: string[] = [];

    if (typeof price !== 'number' || isNaN(price)) {
      errors.push('Price must be a valid number');
    }

    if (price <= this.MIN_PRICE) {
      errors.push(`Price must be greater than ${this.MIN_PRICE}`);
    }

    if (price >= this.MAX_PRICE) {
      errors.push(`Price must be less than ${this.MAX_PRICE}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateCurrency(currency: string): boolean {
    return this.VALID_CURRENCIES.includes(currency);
  }

  validateConfidenceScore(score: number): boolean {
    return score >= this.MIN_CONFIDENCE;
  }

  validateExtractedData(data: ExtractedPrice): ValidationResult {
    const errors: string[] = [];

    // Validate price
    const priceValidation = this.validatePrice(data.price);
    if (!priceValidation.isValid) {
      errors.push(...priceValidation.errors);
    }

    // Validate currency
    if (!this.validateCurrency(data.currency)) {
      errors.push(`Invalid currency: ${data.currency}`);
    }

    // Validate raw value exists
    if (!data.rawValue || data.rawValue.trim().length === 0) {
      errors.push('Raw value is empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 11.2 Price Anomaly Detection

```typescript
// src/lib/services/price-history.service.ts

export class PriceHistoryService {
  private supabase: SupabaseClient;
  private readonly ANOMALY_THRESHOLD = 0.5; // 50% change

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async detectPriceAnomaly(
    offerId: string,
    newPrice: number
  ): Promise<boolean> {
    // Get last price from history
    const { data: lastEntry, error } = await this.supabase
      .from('price_history')
      .select('price')
      .eq('offer_id', offerId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastEntry) {
      return false; // No previous price to compare
    }

    const lastPrice = lastEntry.price;
    const percentChange = Math.abs((newPrice - lastPrice) / lastPrice);

    if (percentChange > this.ANOMALY_THRESHOLD) {
      // Log anomaly
      await this.supabase.from('system_logs').insert({
        offer_id: offerId,
        event_type: 'price_anomaly_detected',
        message: `Price changed by ${(percentChange * 100).toFixed(2)}%`,
        metadata: {
          old_price: lastPrice,
          new_price: newPrice,
          percent_change: percentChange
        }
      });

      return true;
    }

    return false;
  }

  async savePriceEntry(
    offerId: string,
    extractedPrice: ExtractedPrice
  ): Promise<void> {
    const { error } = await this.supabase
      .from('price_history')
      .insert({
        offer_id: offerId,
        price: extractedPrice.price,
        currency: extractedPrice.currency,
        checked_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save price entry: ${error.message}`);
    }
  }

  async updateLastChecked(offerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('offers')
      .update({ last_checked: new Date().toISOString() })
      .eq('id', offerId);

    if (error) {
      throw new Error(`Failed to update last_checked: ${error.message}`);
    }
  }

  async getPriceStats(offerId: string): Promise<PriceStats> {
    const { data, error } = await this.supabase
      .from('price_history')
      .select('price')
      .eq('offer_id', offerId);

    if (error || !data || data.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const prices = data.map(entry => entry.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const count = prices.length;

    return { min, max, avg, count };
  }
}
```

### 11.3 Quality Metrics

Track następujące metryki dla kontroli jakości:

1. **Success Rate**: (successful_checks / total_checks) * 100
   - Target: ≥90%
   - Alert gdy <85%

2. **AI Fallback Rate**: (ai_extractions / total_checks) * 100
   - Target: <20%
   - Wysoki rate = potrzeba aktualizacji selektorów

3. **Anomaly Rate**: (anomalies_detected / successful_checks) * 100
   - Target: <5%
   - Wysoki rate = problem z validation lub scraping

4. **Average Response Time**: avg(scraping_duration)
   - Target: <5s per offer
   - Alert gdy >10s

## 12. Rozważania dotyczące wydajności

### 12.1 Batch Processing Strategy

```typescript
// Process offers in batches to avoid overwhelming system
async function processBatch(
  offers: Offer[],
  batchSize: number,
  supabase: SupabaseClient
): Promise<void> {
  for (let i = 0; i < offers.length; i += batchSize) {
    const batch = offers.slice(i, i + batchSize);
    
    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(offer => processOffer(offer, supabase))
    );
    
    // Log batch results
    const successCount = results.filter(
      r => r.status === 'fulfilled'
    ).length;
    
    console.log(`Batch ${i / batchSize + 1}: ${successCount}/${batch.length} successful`);
    
    // Delay between batches to avoid rate limiting
    if (i + batchSize < offers.length) {
      await delay(5000); // 5s between batches
    }
  }
}
```

### 12.2 Caching Strategy

```typescript
// Cache HTML responses for retry attempts
class ResponseCache {
  private cache: Map<string, { html: string; timestamp: number }> = new Map();
  private readonly TTL = 300000; // 5 minutes

  set(url: string, html: string): void {
    this.cache.set(url, {
      html,
      timestamp: Date.now()
    });
  }

  get(url: string): string | null {
    const cached = this.cache.get(url);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(url);
      return null;
    }
    
    return cached.html;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 12.3 Database Optimization

1. **Indexes**
```sql
-- Ensure indexes for common queries
CREATE INDEX IF NOT EXISTS idx_offers_status_deleted 
ON offers(status, deleted_at) 
WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_offers_last_checked 
ON offers(last_checked);

CREATE INDEX IF NOT EXISTS idx_price_history_offer_checked 
ON price_history(offer_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_created 
ON system_logs(created_at DESC);
```

2. **Query Optimization**
```typescript
// Use select specific columns instead of *
const { data: offers } = await supabase
  .from('offers')
  .select('id, url, selector, last_checked, frequency')
  .eq('status', 'active')
  .is('deleted_at', null);
```

### 12.4 Cost Optimization for AI

1. **Minimize AI Calls**
   - Use AI tylko jako fallback
   - Cache successful selectors
   - Update selectors after successful AI extraction

2. **Use Cheaper Models**
   - gpt-4o-mini zamiast gpt-4 (90% taniej)
   - Claude Haiku dla prostych ekstraktów
   - Locally hosted models dla przyszłej skali

3. **Optimize Prompts**
   - Truncate HTML do 50KB
   - Use structured outputs (JSON schema)
   - Low temperature (0.1) dla consistency

4. **Batch AI Requests** (future enhancement)
   - Group multiple offers in single request
   - Amortize overhead costs

## 13. Etapy wdrożenia

### Faza 1: Foundation Layer (Tydzień 1)

#### 1.1 Setup Environment Variables
```bash
# .env
CRON_SECRET=your-secure-cron-secret
ALERT_WEBHOOK_URL=your-webhook-url
OPENROUTER_API_KEY=your-openrouter-key
```

#### 1.2 Create Database Tables & Functions
- [ ] Create/verify `system_logs` table
- [ ] Create/verify `error_log` table
- [ ] Add indexes for performance
- [ ] Create `check_offer_prices()` SQL function
- [ ] Setup pg_cron schedules

**SQL Migration:**
```sql
-- migrations/001_monitoring_tables.sql
-- (Include table creation SQL from section 10.1)
```

#### 1.3 Define Core Types
- [ ] Add new types to `src/types.ts`:
  - `ExtractedPrice`
  - `RetryDecision`
  - `ValidationResult`
  - `SystemHealth`
  - `AIExtractedPrice`

**Files to create/modify:**
- `src/types.ts` (add new types)

### Faza 2: Core Services (Tydzień 2)

#### 2.1 Implement ScrapingService
- [ ] Create `src/lib/services/scraping.service.ts`
- [ ] Implement `fetchOfferPage()` with User-Agent rotation
- [ ] Implement `extractPriceWithSelector()` with Cheerio
- [ ] Add rate limiting logic
- [ ] Add random delays (2-5s)
- [ ] Handle HTTP errors gracefully

#### 2.2 Implement ValidationService
- [ ] Create `src/lib/services/validation.service.ts`
- [ ] Implement price range validation (0, 10M)
- [ ] Implement currency validation
- [ ] Implement confidence score validation
- [ ] Add comprehensive error messages

#### 2.3 Implement PriceHistoryService
- [ ] Create `src/lib/services/price-history.service.ts`
- [ ] Implement `savePriceEntry()`
- [ ] Implement `updateLastChecked()`
- [ ] Implement `detectPriceAnomaly()` (>50% change)
- [ ] Implement `getPriceStats()`

**Files to create:**
- `src/lib/services/scraping.service.ts`
- `src/lib/services/validation.service.ts`
- `src/lib/services/price-history.service.ts`

### Faza 3: Error Handling & Retry (Tydzień 3)

#### 3.1 Implement ErrorHandlerService
- [ ] Create `src/lib/services/error-handler.service.ts`
- [ ] Implement retry logic with delays (1min, 5min, 15min)
- [ ] Implement status management (active, error, removed)
- [ ] Implement error logging to `error_log`
- [ ] Handle 404/410 specifically (removed status)

#### 3.2 Implement Main Processing Logic
- [ ] Create `src/lib/services/offer-processor.service.ts`
- [ ] Implement `processOffer()` with full workflow
- [ ] Integrate all services (scraping, validation, AI, etc.)
- [ ] Add retry orchestration
- [ ] Handle all error cases

**Files to create:**
- `src/lib/services/error-handler.service.ts`
- `src/lib/services/offer-processor.service.ts`

### Faza 4: AI Integration (Tydzień 3-4)

#### 4.1 Extend AIExtractionService
- [ ] Modify existing `src/lib/services/ai-extraction.service.ts`
- [ ] Add `extractPriceOnly()` method
- [ ] Implement confidence validation (≥0.8)
- [ ] Optimize prompts for price extraction
- [ ] Add selector update logic

#### 4.2 Test AI Fallback
- [ ] Test with various HTML structures
- [ ] Verify confidence scores
- [ ] Test selector persistence
- [ ] Measure cost per AI extraction

**Files to modify:**
- `src/lib/services/ai-extraction.service.ts`

### Faza 5: Monitoring & Alerting (Tydzień 4)

#### 5.1 Implement MonitoringService
- [ ] Create `src/lib/services/monitoring.service.ts`
- [ ] Implement `trackCheckResult()`
- [ ] Implement `calculateSuccessRate()`
- [ ] Implement `getSystemHealth()`
- [ ] Implement `checkAndSendAlert()`

#### 5.2 Setup Alert Channels
- [ ] Configure webhook URL (Slack/Discord)
- [ ] Test alert delivery
- [ ] Verify cooldown period (6h)
- [ ] Test threshold trigger (>15% errors)

**Files to create:**
- `src/lib/services/monitoring.service.ts`

### Faza 6: CRON Endpoint (Tydzień 4-5)

#### 6.1 Create CRON API Endpoint
- [ ] Create `src/pages/api/cron/check-prices.ts`
- [ ] Implement authentication (CRON_SECRET)
- [ ] Implement offer fetching (active status)
- [ ] Implement batch processing (10 offers/batch)
- [ ] Add delays between batches (5s)
- [ ] Integrate MonitoringService for health check

#### 6.2 Setup pg_cron
- [ ] Run migration to create SQL function
- [ ] Schedule cron jobs (6h, 12h, 24h, 48h)
- [ ] Test manual trigger
- [ ] Verify job execution in pg_cron logs

**Files to create:**
- `src/pages/api/cron/check-prices.ts`

**SQL to run:**
```sql
-- Setup from section 5.1
```

### Faza 7: Testing & Validation (Tydzień 5)

#### 7.1 Unit Tests
- [ ] Test ScrapingService (mocked HTTP)
- [ ] Test ValidationService (various inputs)
- [ ] Test PriceHistoryService (DB mocked)
- [ ] Test ErrorHandlerService (retry logic)
- [ ] Test MonitoringService (success rate calculation)

#### 7.2 Integration Tests
- [ ] Test full `processOffer()` flow
- [ ] Test retry mechanism end-to-end
- [ ] Test AI fallback integration
- [ ] Test status transitions
- [ ] Test anomaly detection

#### 7.3 E2E Tests (Playwright)
- [ ] Test cron endpoint authentication
- [ ] Test offer processing (real or staged Otomoto URLs)
- [ ] Test error scenarios (invalid HTML, timeouts)
- [ ] Test alert triggering

**Files to create:**
- `src/lib/services/__tests__/scraping.service.test.ts`
- `src/lib/services/__tests__/validation.service.test.ts`
- `src/lib/services/__tests__/price-history.service.test.ts`
- `src/lib/services/__tests__/error-handler.service.test.ts`
- `src/lib/services/__tests__/monitoring.service.test.ts`
- `e2e/cron-monitoring.spec.ts`

### Faza 8: UI Integration (Tydzień 5-6)

#### 8.1 Update Dashboard to Show Status
- [ ] Modify dashboard API to include status
- [ ] Add status badges to offer list
- [ ] Show last_checked timestamp
- [ ] Add "Reaktywuj" button for error status
- [ ] Handle removed status (gray out, show message)

#### 8.2 Add Manual Recheck Feature
- [ ] Add API endpoint `POST /api/offers/:id/recheck`
- [ ] Trigger immediate price check for single offer
- [ ] Update UI to show loading state
- [ ] Show success/error message

**Files to modify/create:**
- `src/pages/api/dashboard.ts` (add status to response)
- `src/components/dashboard/OfferList.tsx` (add status badges)
- `src/pages/api/offers/[id]/recheck.ts` (new endpoint)

### Faza 9: Performance Optimization (Tydzień 6)

#### 9.1 Database Optimization
- [ ] Add missing indexes (see section 12.3)
- [ ] Optimize queries (select specific columns)
- [ ] Add query explain analysis
- [ ] Setup connection pooling if needed

#### 9.2 Caching Implementation
- [ ] Implement response cache for retry attempts
- [ ] Cache selector updates
- [ ] Add cache invalidation logic

#### 9.3 Load Testing
- [ ] Test with 100 offers
- [ ] Test with 500 offers
- [ ] Measure average processing time
- [ ] Identify bottlenecks

### Faza 10: Deployment & Monitoring (Tydzień 7)

#### 10.1 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Monitor first cron execution
- [ ] Verify alert delivery

#### 10.2 Production Deployment
- [ ] Deploy to production
- [ ] Enable cron schedules
- [ ] Monitor first 24h closely
- [ ] Verify success rate ≥90%

#### 10.3 Documentation
- [ ] Document all services and their APIs
- [ ] Document error codes and handling
- [ ] Document monitoring metrics
- [ ] Create runbook for common issues

**Files to create:**
- `.ai/monitoring-runbook.md` (operational guide)
- `.ai/troubleshooting.md` (common issues)

### Faza 11: Post-Launch Optimization (Tydzień 8+)

#### 11.1 Monitor KPIs
- [ ] Track success rate daily
- [ ] Monitor AI costs
- [ ] Analyze failure patterns
- [ ] Collect user feedback

#### 11.2 Iterative Improvements
- [ ] Update selectors for common patterns
- [ ] Optimize AI prompts based on performance
- [ ] Adjust retry delays if needed
- [ ] Implement additional caching

#### 11.3 Future Enhancements
- [ ] Per-offer frequency (not global)
- [ ] User notifications for price drops
- [ ] Historical price trends and predictions
- [ ] Support for additional websites beyond Otomoto

---

## Checklisty i gotowe zadania

### Checklist: Przed rozpoczęciem implementacji

- [ ] Reviewed this implementation plan completely
- [ ] All team members understand the architecture
- [ ] Environment variables configured
- [ ] Supabase project is setup with pg_cron
- [ ] OpenRouter.ai account and API key obtained
- [ ] Alert webhook configured (Slack/Discord)
- [ ] Test Otomoto URLs collected for testing
- [ ] Database backup strategy in place

### Checklist: Definition of Done dla każdej fazy

- [ ] All code written with proper TypeScript types
- [ ] Unit tests written with ≥80% coverage
- [ ] Integration tests pass
- [ ] Linter passes with no errors
- [ ] Code reviewed by at least one team member
- [ ] Documentation updated
- [ ] Deployed to staging and tested
- [ ] Performance metrics acceptable

### Success Criteria (Acceptance Testing)

Po pełnym wdrożeniu system musi spełniać:

1. **Functional Requirements**
   - [ ] Cron job uruchamia się zgodnie z harmonogramem
   - [ ] Active offers są sprawdzane cyklicznie
   - [ ] Ceny są zapisywane do price_history
   - [ ] Retry działa z opóźnieniami 1min, 5min, 15min
   - [ ] Status zmienia się na 'error' po 3 próbach
   - [ ] Status zmienia się na 'removed' dla 404/410
   - [ ] Oferty 'removed' nie są sprawdzane
   - [ ] Alert wysyłany przy >15% błędów
   - [ ] Alert ma cooldown 6h

2. **Performance Requirements**
   - [ ] Success rate ≥90% w ciągu 7 dni
   - [ ] Średni czas sprawdzenia <5s per offer
   - [ ] Batch processing działa bez timeout
   - [ ] AI fallback rate <20%

3. **Quality Requirements**
   - [ ] Wszystkie testy przechodzą
   - [ ] Brak critical/high linter errors
   - [ ] Code coverage ≥80%
   - [ ] No memory leaks detected

4. **Security Requirements**
   - [ ] CRON endpoint wymaga auth
   - [ ] User-Agent rotation działa
   - [ ] Rate limiting jest aktywne
   - [ ] Secrets nie są hardcoded

---

## Podsumowanie

Ten plan wdrożenia dostarcza kompleksowy roadmap dla implementacji mechanizmu automatycznego monitorowania cen ofert z Otomoto.pl. Kluczowe elementy sukcesu to:

1. **Modułowa architektura** - każdy serwis ma jasno określone odpowiedzialności
2. **Robustna obsługa błędów** - 3-stopniowy retry z inteligentnym zarządzaniem statusami
3. **Optymalizacja kosztów** - selector-first approach z AI jako fallback
4. **Monitoring i alerting** - proaktywne wykrywanie problemów
5. **Skalowalność** - batch processing i caching dla przyszłego wzrostu

Realizując ten plan krok po kroku według przedstawionych faz, zespół dostarczy solidny, niezawodny system monitorowania cen, który osiągnie KPI 90% skuteczności i zapewni wartość dla użytkowników końcowych.

