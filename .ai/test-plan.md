Rozpoczynam szczegółową analizę bazy kodu projektu 10xPriceHistory.

[15 tools called]

Przeprowadzam szczegółową analizę bazy kodu...

[3 tools called]

Doskonale, mam już wszystkie niezbędne informacje. Przygotowuję kompleksowy plan testów dla projektu PriceHistory.

<test_plan>

# Plan Testów - PriceHistory (MVP)

## 1. Przegląd strategii testowania

### 1.1 Cele testowania

Główne cele testowania aplikacji PriceHistory:

1. **Weryfikacja dokładności ekstrakcji danych** - Osiągnięcie 90% skuteczności pobierania i zapisywania cen (cel biznesowy MVP)
2. **Bezpieczeństwo i izolacja danych** - Zapewnienie, że Row Level Security (RLS) skutecznie chroni dane użytkowników
3. **Niezawodność automatycznego monitorowania** - Weryfikacja działania cron jobs i retry mechanism
4. **Integralność biznesowa** - Testowanie limitów (5 ofert, 10 dodań/24h), soft-delete, walidacji danych
5. **Jakość UX** - Weryfikacja responsywności, obsługi błędów, formularzy

### 1.2 Zakres testowania

**W zakresie:**
- Ekstrakcja danych z Otomoto.pl (Cheerio + AI fallback)
- API endpoints (auth, offers, dashboard, preferences)
- Serwisy backendowe (OfferService, DashboardService, OpenRouterService)
- Uwierzytelnianie i autoryzacja (Supabase Auth + middleware)
- Row Level Security (RLS) policies
- Walidacja danych (Zod schemas)
- Komponenty React (formularze, wykresy, dashboardy)
- Obliczenia biznesowe (% zmian cen, statystyki)

**Poza zakresem MVP:**
- Testy obciążeniowe dla >100 użytkowników
- Testy mobilne (aplikacja webowa only)
- Testy dla witryn innych niż Otomoto.pl
- Zaawansowane scenariusze współdzielenia ofert

### 1.3 Ocena ryzyka

| Obszar | Ryzyko | Wpływ | Priorytet testowania |
|--------|--------|-------|---------------------|
| **Web Scraping** | Zmiana struktury HTML Otomoto.pl | **Krytyczny** | 🔴 Najwyższy |
| **RLS Policies** | Wyciek danych między użytkownikami | **Krytyczny** | 🔴 Najwyższy |
| **OpenRouter AI** | Nieprawidłowa ekstrakcja cen | **Wysoki** | 🟠 Wysoki |
| **Cron Jobs** | Brak automatycznego monitorowania | **Wysoki** | 🟠 Wysoki |
| **Limity biznesowe** | Obejście limitów 5 ofert/10 dodań | **Średni** | 🟡 Średni |
| **Uwierzytelnianie** | Nieautoryzowany dostęp | **Krytyczny** | 🔴 Najwyższy |
| **Obliczenia % zmian** | Nieprawidłowe wykresy/statystyki | **Średni** | 🟡 Średni |
| **Walidacja wejść** | SQL injection, XSS | **Wysoki** | 🟠 Wysoki |

---

## 2. Typy i poziomy testów

### 2.1 Testy jednostkowe (Unit Tests)

**Framework:** Vitest (rekomendowany dla projektów Vite/Astro)

**Priorytetowe obszary:**

#### 2.1.1 Serwisy (src/lib/services/)

**OfferService** (`offer.service.ts`)
- ✅ `list()` - paginacja, sortowanie, obliczanie % zmian
- ✅ `getDetail()` - agregacja statystyk (min, max, avg)
- ✅ `add()` - logika dodawania/reaktywacji ofert
- ✅ `unsubscribe()` - soft-delete mechanism
- ✅ `getHistory()` - paginacja historii cen
- ✅ `extractOfferData()` - fallback Cheerio → AI
- ✅ `extractWithCheerio()` - wszystkie selektory CSS
- ✅ `extractWithLLM()` - obsługa response format
- ✅ `validatePriceChange()` - warning >50% zmiana

**DashboardService** (`dashboard.service.ts`)
- ✅ `get()` - agregacja summary
- ✅ `calculateSummary()` - activeCount, avgChange, largestDrop/Rise

**OpenRouterService** (`openrouter.service.ts`)
- ✅ `sendChatCompletion()` - request/response handling
- ✅ `parseAndValidateStructuredResponse()` - JSON schema validation
- ✅ Retry mechanism z exponential backoff
- ✅ Rate limiting
- ✅ Error handling (timeout, 429, 5xx)

#### 2.1.2 Walidatory (src/lib/validators/)

**auth.validators.ts**
- ✅ `LoginSchema` - email format, required fields
- ✅ `RegisterSchema` - password min 8 chars, captcha
- ✅ `ChangePasswordSchema` - current + new password
- ✅ `DeleteAccountSchema` - confirmation literal "USUŃ"

#### 2.1.3 Komponenty React (src/components/)

**OfferForm.tsx**
- ✅ URL validation (must contain "otomoto.pl")
- ✅ Submit handling (success/error states)
- ✅ Form reset after success

**PriceHistoryChart.tsx**
- ✅ Dane wejściowe (empty, single point, multiple points)
- ✅ Formatowanie daty/ceny
- ✅ Tooltip rendering

**OfferCard.tsx**
- ✅ Badge colors (green dla spadku, red dla wzrostu)
- ✅ Percentage calculation display

**useOfferData.ts (hook)**
- ✅ Transformacja OfferDto → ViewModels
- ✅ Obliczenia duration, trend determination
- ✅ Chart data formatting

#### 2.1.4 Utilities

**src/lib/utils/auth.utils.ts**
- ✅ Cookie handling helpers (jeśli istnieją)
- ✅ JWT parsing/validation helpers

---

### 2.2 Testy integracyjne (Integration Tests)

**Framework:** Vitest + @astrojs/test-client (dla API) + Testing Library (dla React)

#### 2.2.1 API Endpoints

**GET /api/offers**
- ✅ Authorization check (401 bez tokenu)
- ✅ Paginacja (page, size)
- ✅ Sortowanie (created_at, last_checked, title)
- ✅ Filtry RLS (użytkownik widzi tylko swoje oferty)
- ✅ Response format validation

**POST /api/offers**
- ✅ Dodanie nowej oferty (scraping + zapis do DB)
- ✅ Reaktywacja usuniętej oferty (deleted_at = NULL)
- ✅ Duplikat aktywnej subskrypcji (409)
- ✅ Limit 5 aktywnych ofert (429)
- ✅ Limit 10 dodań/24h (429, trigger DB)
- ✅ Walidacja URL (musi być Otomoto.pl)
- ✅ Fallback AI gdy Cheerio fails
- ✅ Timeout scrapingu (10s)

**GET /api/offers/[id]**
- ✅ Pobieranie szczegółów oferty
- ✅ Authorization (tylko subskrybenci)
- ✅ 404 dla nieistniejącej oferty
- ✅ 403 dla oferty innego użytkownika

**DELETE /api/offers/[id]**
- ✅ Soft-delete (ustawienie deleted_at)
- ✅ Authorization check
- ✅ 404/403 handling

**GET /api/offers/[id]/history**
- ✅ Paginacja historii cen
- ✅ Sortowanie po checked_at DESC
- ✅ Authorization check
- ✅ Response format

**GET /api/dashboard**
- ✅ Summary calculations (activeCount, avgChange, drops/rises)
- ✅ Integracja z OfferService.list()
- ✅ Edge cases (0 ofert, wszystkie removed)

**GET/POST /api/preferences**
- ✅ Pobieranie preferencji użytkownika
- ✅ Aktualizacja default_frequency
- ✅ Walidacja enum frequency (6h/12h/24h/48h)
- ✅ RLS policies

**POST /api/llm**
- ✅ Kompresja HTML
- ✅ Wysyłanie requestu do OpenRouter
- ✅ Walidacja response schema
- ✅ Error handling (timeout, quota)
- ✅ Logging API usage

#### 2.2.2 Uwierzytelnianie

**Middleware** (`src/middleware/index.ts`)
- ✅ Public paths bypass (/, /login, /register, etc.)
- ✅ Protected routes redirect (/dashboard, /settings, /offer)
- ✅ JWT validation przez Supabase
- ✅ Ustawienie Astro.locals (user, supabase, current_user_id)
- ✅ returnUrl w redirect

**Auth Endpoints**
- ✅ POST /api/auth/login - credentials validation, session creation
- ✅ POST /api/auth/register - email verification flow
- ✅ POST /api/auth/logout - session cleanup
- ✅ POST /api/auth/forgot-password - reset link
- ✅ POST /api/auth/reset-password - token validation
- ✅ POST /api/auth/resend-verification - email throttling

#### 2.2.3 Integracja Bazy Danych

**RLS Policies Testing**
- ✅ `offers_select_authenticated` - user widzi wszystkie oferty
- ✅ `user_offer_select_authenticated` - user widzi tylko swoje subskrypcje
- ✅ `price_history_select_authenticated` - dostęp tylko do subskrybowanych ofert
- ✅ `user_preferences_*` - izolacja preferencji użytkownika
- ✅ Test z dwoma użytkownikami (user A nie widzi danych user B)

**Triggers**
- ✅ `check_offer_addition_limit` - max 10 dodań/24h
- ✅ `update_updated_at_column` - auto-update timestamps

**Soft-Delete Pattern**
- ✅ DELETE oferty ustawia deleted_at
- ✅ Limit 5 ofert liczy tylko deleted_at IS NULL
- ✅ Historia cen zachowana po soft-delete

---

### 2.3 Testy systemowe / End-to-End (E2E)

**Framework:** Playwright

#### 2.3.1 Ścieżki użytkownika (User Journeys)

**Journey 1: Rejestracja i pierwsze użycie**
1. Odwiedzenie landing page (/)
2. Kliknięcie "Zacznij za darmo" → /register
3. Wypełnienie formularza rejestracji (email, hasło, captcha)
4. Weryfikacja emaila (kliknięcie linku)
5. Logowanie → /dashboard (pusty)
6. Dodanie pierwszej oferty z Otomoto.pl
7. Weryfikacja karty oferty na dashboardzie

**Journey 2: Pełny cykl monitorowania oferty**
1. Logowanie do istniejącego konta
2. Dodanie oferty (URL Otomoto.pl)
3. Weryfikacja ekstrakcji danych (tytuł, cena, zdjęcie, miasto)
4. Przejście do /offer/[id]
5. Sprawdzenie wykresu, tabeli historii, statystyk
6. Usunięcie oferty (soft-delete)
7. Weryfikacja zniknięcia z dashboardu

**Journey 3: Limity i walidacja**
1. Dodanie 5 ofert (limit free tier)
2. Próba dodania 6-tej oferty → error 429
3. Usunięcie jednej oferty
4. Dodanie nowej oferty (reaktywacja licznika)
5. Próba dodania 10 ofert w 24h → error 429 (trigger)

**Journey 4: Ustawienia użytkownika**
1. Przejście do /settings
2. Zmiana hasła (current + new)
3. Zmiana default_frequency (24h → 12h)
4. Próba usunięcia konta bez potwierdzenia → error
5. Usunięcie konta z potwierdzeniem "USUŃ"
6. Weryfikacja wylogowania

#### 2.3.2 Testy responsywności
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

#### 2.3.3 Testy cross-browser
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

---

### 2.4 Testy wydajności

**Narzędzie:** k6 / Artillery

#### 2.4.1 Load Testing

**Scenariusz 1: Dashboard load**
- Virtual users: 50 concurrent
- Duration: 5 minut
- Endpoint: GET /api/dashboard
- Acceptance: p95 < 500ms, error rate < 1%

**Scenariusz 2: Offer list pagination**
- Virtual users: 100 concurrent
- Duration: 10 minut
- Endpoint: GET /api/offers?page=1&size=10
- Acceptance: p95 < 300ms, error rate < 1%

**Scenariusz 3: Add offer (scraping)**
- Virtual users: 10 concurrent (niski ze względu na scraping)
- Duration: 5 minut
- Endpoint: POST /api/offers
- Acceptance: p95 < 10s (timeout 10s), error rate < 10%

#### 2.4.2 Database Performance

**Query optimization:**
- ✅ Indeksy używane w zapytaniach (EXPLAIN ANALYZE)
  - `idx_user_offer_user_deleted`
  - `idx_price_history_offer_checked_desc`
  - `idx_offers_status_checked`
- ✅ N+1 queries detection (batch fetching w OfferService.list)
- ✅ Connection pooling (Supabase defaults)

**Retention cleanup:**
- ✅ Performance DELETE price_history WHERE checked_at < NOW() - INTERVAL '30 days'
- ✅ Test na tabeli z 100k+ wpisami

#### 2.4.3 Cron Job Performance

**Symulacja cron job:**
- Utworzenie 100 aktywnych ofert
- Uruchomienie job (pobieranie + zapis cen)
- Metryki:
  - Czas wykonania całego job
  - Średni czas na ofertę
  - Success rate
  - Memory usage

---

### 2.5 Testy bezpieczeństwa

#### 2.5.1 Uwierzytelnianie i Autoryzacja

**OWASP Top 10 Coverage:**

1. **Broken Access Control (A01)**
   - ✅ Test RLS policies (user nie widzi danych innego usera)
   - ✅ Próba dostępu do /api/offers/[id] innego użytkownika → 403
   - ✅ Bypassing middleware (bezpośredni request bez JWT) → 401

2. **Cryptographic Failures (A02)**
   - ✅ JWT token secure (HttpOnly, Secure, SameSite=Lax)
   - ✅ Hasła hashowane przez Supabase (bcrypt)
   - ✅ HTTPS enforcement w production

3. **Injection (A03)**
   - ✅ SQL injection: parametryzowane zapytania (Supabase SDK)
   - ✅ XSS: sanitizacja inputów (React auto-escape + Zod validation)
   - ✅ Command injection w scraping (User-Agent validation)

4. **Insecure Design (A04)**
   - ✅ Rate limiting (10 dodań/24h, trigger DB)
   - ✅ Soft-delete zamiast hard-delete (audit trail)
   - ✅ Walidacja na backendzie (nie tylko frontend)

5. **Security Misconfiguration (A05)**
   - ✅ Brak .env w repo (check .gitignore)
   - ✅ CORS configuration (only allowed origins)
   - ✅ Default credentials nieużywane

6. **Vulnerable Components (A06)**
   - ✅ npm audit (dependency scanning)
   - ✅ Aktualizacja Supabase, React, Astro do latest stable
   - ✅ Monitoring CVE dla Cheerio, OpenRouter deps

7. **Authentication Failures (A07)**
   - ✅ Password policy (min 8 chars)
   - ✅ Brute-force protection (Supabase rate limits)
   - ✅ Session timeout (JWT expiry)
   - ✅ Email verification required

8. **Data Integrity Failures (A08)**
   - ✅ Walidacja typu danych (Zod schemas)
   - ✅ ENUM constraints w DB
   - ✅ Checksums dla critical data (opcjonalne)

#### 2.5.2 Testy Web Scraping

**User-Agent Rotation:**
- ✅ Rotacja między różnymi UA strings
- ✅ Opóźnienia 2-5s między requestami
- ✅ Brak blokady IP przez Otomoto.pl

**HTML Injection:**
- ✅ Testowanie z malicious HTML w odpowiedzi scraping
- ✅ Sanitizacja before save do DB

#### 2.5.3 Penetration Testing (Manual)

**Checklist:**
- ✅ JWT token manipulation (zmiana user_id w payload)
- ✅ CSRF (czy Supabase SDK chroni?)
- ✅ Clickjacking (X-Frame-Options header)
- ✅ Information disclosure (stack traces w production)

---

## 3. Przypadki testowe i scenariusze

### 3.1 Ekstrakcja danych (Web Scraping)

#### TC-SCRAPE-001: Cheerio extraction success
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** Otomoto.pl dostępne, oferta aktywna  
**Kroki:**
1. Wywołanie `OfferService.extractWithCheerio(html)` z prawdziwym HTML
2. Weryfikacja wyekstrahowanych danych
**Oczekiwany rezultat:**
- `title` niepuste, zawiera model samochodu
- `price` > 0 i < 10,000,000
- `currency` = "PLN"
- `imageUrl` format URL (startsWith "http")
- `city` niepuste
- `selector` niepuste

#### TC-SCRAPE-002: Cheerio fallback selectors
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** HTML z starą strukturą Otomoto  
**Kroki:**
1. Przygotowanie HTML z usuniętymi `data-testid`
2. Wywołanie extraction
**Oczekiwany rezultat:**
- Fallback na legacy selectors (.offer-title, .offer-price__number)
- Ekstrakcja sukces

#### TC-SCRAPE-003: LLM extraction fallback
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** OpenRouter API key ustawiony, Cheerio fails  
**Kroki:**
1. Mock Cheerio extraction (throw error)
2. Wywołanie `extractOfferData()`
3. Weryfikacja wywołania OpenRouter
**Oczekiwany rezultat:**
- LLM request wysłany
- Response parsed i zwalidowany przez JSON Schema
- Dane wyekstrahowane poprawnie

#### TC-SCRAPE-004: Timeout handling
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** Slow Otomoto.pl response  
**Kroki:**
1. Mock fetch z 15s delay
2. Wywołanie extraction (timeout 10s)
**Oczekiwany rezultat:**
- Request aborted po 10s
- Error "Failed to fetch HTML: Timeout"

#### TC-SCRAPE-005: HTML compression dla LLM
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** Duży HTML (>100KB)  
**Kroki:**
1. Wywołanie compression w `extractWithLLM()`
2. Weryfikacja długości compressed HTML
**Oczekiwany rezultat:**
- HTML zawiera tylko istotne elementy (header, content, price)
- Rozmiar < 30KB dla optymalizacji kosztów

---

### 3.2 Limity biznesowe

#### TC-LIMIT-001: 5 aktywnych ofert (free tier)
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** User ma 5 aktywnych ofert  
**Kroki:**
1. POST /api/offers z nowym URL
**Oczekiwany rezultat:**
- Status 429 Too Many Requests
- Error: "Limit of 5 active offers reached"

#### TC-LIMIT-002: Soft-delete nie liczy się do limitu
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** User ma 5 aktywnych + 3 usunięte  
**Kroki:**
1. Weryfikacja `SELECT COUNT(*) WHERE deleted_at IS NULL`
**Oczekiwany rezultat:**
- Count = 5 (nie 8)

#### TC-LIMIT-003: 10 dodań w 24h (DB trigger)
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** User dodał 10 ofert w ciągu dnia  
**Kroki:**
1. Próba INSERT 11-tej oferty
**Oczekiwany rezultat:**
- Exception z triggera: "Rate limit exceeded: maximum 10 offer additions per 24 hours"
- Status 429

#### TC-LIMIT-004: Reaktywacja usuniętej oferty
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** User ma usuniętą ofertę (deleted_at NOT NULL)  
**Kroki:**
1. POST /api/offers z tym samym URL
**Oczekiwany rezultat:**
- UPDATE user_offer SET deleted_at = NULL
- Status 200, message: "Offer subscription reactivated"
- Nie tworzy duplikatu

---

### 3.3 Row Level Security (RLS)

#### TC-RLS-001: Izolacja ofert użytkowników
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** User A i User B mają po 3 oferty  
**Kroki:**
1. Logowanie jako User A
2. GET /api/offers
3. Weryfikacja count
**Oczekiwany rezultat:**
- User A widzi tylko swoje 3 oferty
- User B data niewidoczna

#### TC-RLS-002: Próba dostępu do oferty innego użytkownika
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** User A ma offer_id=10, User B logowany  
**Kroki:**
1. User B: GET /api/offers/10
**Oczekiwany rezultat:**
- Status 403 Forbidden (lub 404 dla security obscurity)

#### TC-RLS-003: Historia cen izolowana
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** Offer 10 subskrybowana przez User A  
**Kroki:**
1. User B: GET /api/offers/10/history
**Oczekiwany rezultat:**
- Status 403 (brak autoryzacji)
- User A może zobaczyć historię

#### TC-RLS-004: User preferences isolation
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** User A i User B mają różne default_frequency  
**Kroki:**
1. User A: GET /api/preferences
2. Weryfikacja frequency
**Oczekiwany rezultat:**
- User A widzi tylko swoje preferencje

---

### 3.4 Obliczenia biznesowe

#### TC-CALC-001: Procent zmiany od pierwszej ceny
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** Offer z historią: [1000, 950, 900]  
**Kroki:**
1. Wywołanie `OfferService.list()`
2. Sprawdzenie `percentChangeFromFirst`
**Oczekiwany rezultat:**
- percentChangeFromFirst = -10.0 (900 vs 1000)

#### TC-CALC-002: Procent zmiany od poprzedniej ceny
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** Historia: [1000, 950, 900]  
**Kroki:**
1. Sprawdzenie `percentChangeFromPrevious`
**Oczekiwany rezultat:**
- percentChangeFromPrevious = -5.26 (900 vs 950)

#### TC-CALC-003: Statystyki (min, max, avg)
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** Historia: [1000, 1200, 800, 900, 1100]  
**Kroki:**
1. Wywołanie `OfferService.getDetail()`
2. Sprawdzenie stats
**Oczekiwany rezultat:**
- min = 800
- max = 1200
- avg = 1000

#### TC-CALC-004: Dashboard summary
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** User ma 5 ofert: [+5%, -10%, +2%, -3%, +1%]  
**Kroki:**
1. GET /api/dashboard
2. Sprawdzenie summary
**Oczekiwany rezultat:**
- activeCount = 5
- avgChange = -1.0%
- largestDrop = -10%
- largestRise = +5%

#### TC-CALC-005: Warning >50% price change
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** Cena była 1000, nowa to 400 (-60%)  
**Kroki:**
1. Wywołanie `validatePriceChange()`
2. Sprawdzenie console.warn
**Oczekiwany rezultat:**
- Log: "⚠️ WARNING: Price changed by 60.0%"
- Zapis nie zablokowany (PRD: warning nie blokuje)

---

### 3.5 Walidacja i obsługa błędów

#### TC-VAL-001: Email format validation
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** RegisterSchema  
**Kroki:**
1. Input: `{ email: "invalid", password: "12345678" }`
2. Walidacja przez Zod
**Oczekiwany rezultat:**
- Error: "Wprowadź prawidłowy adres email"

#### TC-VAL-002: Password minimum length
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** RegisterSchema  
**Kroki:**
1. Input: `{ email: "test@test.com", password: "1234" }`
**Oczekiwany rezultat:**
- Error: "Hasło musi mieć minimum 8 znaków"

#### TC-VAL-003: URL must be Otomoto.pl
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** OfferForm component  
**Kroki:**
1. Input: `{ url: "https://allegro.pl/car-123" }`
2. Submit form
**Oczekiwany rezultat:**
- Error: "URL must be from otomoto.pl"

#### TC-VAL-004: Frequency enum validation
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** POST /api/preferences  
**Kroki:**
1. Body: `{ defaultFrequency: "1h" }` (nieprawidłowy)
**Oczekiwany rezultat:**
- Status 400
- Error: "Invalid frequency" (dozwolone: 6h/12h/24h/48h)

#### TC-ERROR-001: Network error handling
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** Frontend submit, backend offline  
**Kroki:**
1. OfferForm: submit URL
2. Mock fetch error
**Oczekiwany rezultat:**
- User widzi toast: "Failed to add offer"
- Button disabled podczas loading

#### TC-ERROR-002: OpenRouter timeout
**Priorytet:** 🟡 Średni  
**Warunki wstępne:** OpenRouter slow (>60s)  
**Kroki:**
1. POST /api/llm
2. Mock timeout
**Oczekiwany rezultat:**
- Status 500
- Error: "Request timeout after 60000ms"
- Fallback na Cheerio

---

### 3.6 Automatyczne monitorowanie (Cron)

#### TC-CRON-001: Scheduled job pobiera aktywne oferty
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** 10 ofert w DB (7 active, 3 removed)  
**Kroki:**
1. Wywołanie cron job function
2. Query: `SELECT * FROM offers WHERE status = 'active'`
**Oczekiwany rezultat:**
- Job przetwarza tylko 7 active ofert

#### TC-CRON-002: Retry mechanism (1min, 5min, 15min)
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** Scraping fails pierwszy raz  
**Kroki:**
1. Symulacja błędu extraction
2. Sprawdzenie retry logic
**Oczekiwany rezultat:**
- Wait 1min → retry
- Wait 5min → retry
- Wait 15min → retry
- Po 3 porażkach: status = 'error'

#### TC-CRON-003: 404/410 → status removed
**Priorytet:** 🟠 Wysoki  
**Warunki wstępne:** Otomoto.pl zwraca 404  
**Kroki:**
1. Cron job fetch URL
2. HTTP 404
**Oczekiwany rezultat:**
- UPDATE offers SET status = 'removed'
- Brak dalszych prób

#### TC-CRON-004: Price history insert
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** Scraping sukces, nowa cena 1200 PLN  
**Kroki:**
1. Cron job extract price
2. INSERT price_history
**Oczekiwany rezultat:**
- Nowy wpis z price=1200, currency=PLN, checked_at=NOW()
- UPDATE offers.last_checked = NOW()

#### TC-CRON-005: 90% success rate requirement
**Priorytet:** 🔴 Krytyczny  
**Warunki wstępne:** 100 ofert processed  
**Kroki:**
1. Symulacja 10 błędów extraction
2. Weryfikacja success_count / total
**Oczekiwany rezultat:**
- Success rate = 90/100 = 90% ✅

---

## 4. Rekomendacje narzędzi i frameworków

### 4.1 Test Framework Recommendations

| Typ testu | Narzędzie | Uzasadnienie |
|-----------|-----------|--------------|
| **Unit Tests** | Vitest | - Natywna integracja z Vite/Astro<br>- Szybkie (parallelizacja)<br>- Compatible z TypeScript<br>- Jest-like API |
| **Integration (API)** | Vitest + @astrojs/test-client | - Natywne uruchamianie Astro endpointów<br>- Mniej mocków (middleware, routing)<br>- Łatwa integracja z Supabase test doubles |
| **Integration (React)** | Vitest + Testing Library | - @testing-library/react<br>- @testing-library/user-event<br>- Mock fetch, localStorage |
| **E2E** | Playwright | - Cross-browser (Chromium, Firefox, WebKit)<br>- Auto-wait<br>- Screenshots/videos<br>- Parallel execution |
| **Performance** | k6 | - Scripting w JavaScript<br>- Grafana Cloud integration<br>- Thresholds dla CI/CD |
| **Visual Regression** | Playwright snapshot testing | - Wbudowane w Playwright screenshot diffy<br>- Brak dodatkowych SaaS<br>- Wspólna konfiguracja z E2E |

### 4.2 Setup i konfiguracja

#### 4.2.1 Vitest Setup

**package.json:**
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "@astrojs/test-client": "^0.13.0",
    "msw": "^2.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/', 'dist/']
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});
```

**Snapshoty wizualne:**
```typescript
await expect(page).toHaveScreenshot('dashboard.png');
await expect(chartContainer).toMatchSnapshot('price-history-chart.snap');
```

**tests/setup.ts:**
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.mock('import.meta.env', () => ({
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'test-key',
  OPENROUTER_API_KEY: 'test-openrouter-key'
}));
```

**Przykład użycia `@astrojs/test-client`:**
```typescript
import { createTestClient } from '@astrojs/test-client';
import app from '../../src/pages/api/offers/index';

const client = await createTestClient({ app });

const response = await client.get('/api/offers');
expect(response.status).toBe(200);
```

#### 4.2.2 Playwright Setup

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],
  expect: {
    toHaveScreenshot: { threshold: 0.2 },
    toMatchSnapshot: { threshold: 0.2 }
  },
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } }
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI
  }
});
```

#### 4.2.3 Mock Service Worker (MSW)

Dla mockowania API requests w testach:

**tests/mocks/handlers.ts:**
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/offers', () => {
    return HttpResponse.json({
      data: [],
      page: 1,
      size: 10,
      total: 0
    });
  }),
  
  http.post('/api/offers', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 123,
      message: 'Offer added'
    });
  })
];
```

**tests/mocks/server.ts:**
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

### 4.3 Strategia automatyzacji testów

#### 4.3.1 CI/CD Pipeline (GitHub Actions)

**.github/workflows/test.yml:**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.14.0'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

#### 4.3.2 Pre-commit Hooks (Husky)

**.husky/pre-commit:**
```bash
#!/bin/sh
npm run lint
npm run test -- --run --reporter=basic
```

#### 4.3.3 Test Coverage Targets

| Obszar | Target Coverage | Priorytet |
|--------|----------------|-----------|
| **Serwisy** | ≥90% | 🔴 Krytyczny |
| **API Endpoints** | ≥85% | 🔴 Krytyczny |
| **Komponenty React** | ≥80% | 🟠 Wysoki |
| **Utils/Helpers** | ≥90% | 🟠 Wysoki |
| **Ogólny projekt** | ≥80% | 🟡 Średni |

---

## 5. Wymagania dotyczące środowiska i danych testowych

### 5.1 Środowiska testowe

#### 5.1.1 Local Development
- **Node.js:** 22.14.0 (z .nvmrc)
- **PostgreSQL:** Supabase local (Docker)
- **Test DB:** Osobna instancja z seed data
- **.env.test:**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<local-anon-key>
OPENROUTER_API_KEY=<test-key-with-low-limit>
```

#### 5.1.2 CI Environment (GitHub Actions)
- **PostgreSQL:** Service container
- **Supabase:** Mock lub staging instance
- **OpenRouter:** Mock responses (nie zużywać quota)

#### 5.1.3 Staging
- **URL:** staging.10xpricehistory.com
- **DB:** Dedykowany Supabase project
- **Data:** Synthetic test data (nie production)
- **OpenRouter:** Separate API key z limitem $5/miesiąc

#### 5.1.4 Production
- **Smoke tests only:** Podstawowe health checks
- **Monitoring:** Real-time alerting (Sentry, LogRocket)

---

### 5.2 Dane testowe (Test Fixtures)

#### 5.2.1 Test Users

**tests/fixtures/users.sql:**
```sql
-- User A (free tier, 3 oferty)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-user-a@example.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- User B (free tier, 5 ofert - limit reached)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'test-user-b@example.com',
  crypt('password123', gen_salt('bf')),
  now()
);
```

#### 5.2.2 Test Offers

**tests/fixtures/offers.sql:**
```sql
-- Oferta z stabilną ceną (BMW)
INSERT INTO offers (id, url, title, image_url, selector, city, status, frequency)
VALUES (
  1,
  'https://www.otomoto.pl/osobowe/bmw/seria-3/seg-sedan/bmw-seria-3-320d-xdrive-test',
  'BMW Seria 3 320d xDrive',
  'https://ireland.apollo.olxcdn.com/v1/files/test.jpg',
  'h3[data-testid="ad-price"]',
  'Warszawa',
  'active',
  '24h'
);

-- Oferta z dużą zmianą ceny (Audi)
INSERT INTO offers (id, url, title, image_url, selector, city, status, frequency)
VALUES (
  2,
  'https://www.otomoto.pl/osobowe/audi/a4/audi-a4-b9-test',
  'Audi A4 B9 2.0 TDI',
  'https://ireland.apollo.olxcdn.com/v1/files/test2.jpg',
  'h3[data-testid="ad-price"]',
  'Kraków',
  'active',
  '12h'
);

-- Oferta usunięta z Otomoto
INSERT INTO offers (id, url, title, image_url, selector, city, status)
VALUES (
  3,
  'https://www.otomoto.pl/osobowe/mercedes-benz/klasa-c/removed-offer',
  'Mercedes C-Class (REMOVED)',
  NULL,
  'h3[data-testid="ad-price"]',
  'Gdańsk',
  'removed'
);
```

#### 5.2.3 Price History

**tests/fixtures/price_history.sql:**
```sql
-- BMW: stabilna cena 50,000 PLN (±500)
INSERT INTO price_history (offer_id, price, currency, checked_at) VALUES
(1, 50000, 'PLN', now() - interval '30 days'),
(1, 50200, 'PLN', now() - interval '20 days'),
(1, 49800, 'PLN', now() - interval '10 days'),
(1, 50100, 'PLN', now());

-- Audi: duży spadek ceny 80,000 → 60,000 (-25%)
INSERT INTO price_history (offer_id, price, currency, checked_at) VALUES
(2, 80000, 'PLN', now() - interval '30 days'),
(2, 75000, 'PLN', now() - interval '20 days'),
(2, 65000, 'PLN', now() - interval '10 days'),
(2, 60000, 'PLN', now());
```

#### 5.2.4 User Subscriptions

**tests/fixtures/user_offer.sql:**
```sql
-- User A subskrybuje offers 1, 2
INSERT INTO user_offer (user_id, offer_id, created_at, deleted_at) VALUES
('00000000-0000-0000-0000-000000000001', 1, now() - interval '30 days', NULL),
('00000000-0000-0000-0000-000000000001', 2, now() - interval '20 days', NULL);

-- User B subskrybuje 5 ofert (limit free tier)
INSERT INTO user_offer (user_id, offer_id, created_at) VALUES
('00000000-0000-0000-0000-000000000002', 1, now() - interval '10 days'),
('00000000-0000-0000-0000-000000000002', 2, now() - interval '9 days'),
-- ... (3 more offers)
```

#### 5.2.5 Mock HTML Responses

**tests/fixtures/otomoto-html.ts:**
```typescript
export const VALID_OTOMOTO_HTML = `
<html>
  <head><title>BMW Seria 3</title></head>
  <body>
    <h1 data-testid="ad-title">BMW Seria 3 320d xDrive</h1>
    <h3 data-testid="ad-price">50 000 PLN</h3>
    <a data-testid="ad-location" href="/warszawa">Warszawa</a>
    <meta property="og:image" content="https://image.jpg" />
  </body>
</html>
`;

export const LEGACY_OTOMOTO_HTML = `
<html>
  <body>
    <h1 class="offer-title">BMW Seria 3</h1>
    <div class="offer-price__number">50 000</div>
    <div class="offer-price__currency">PLN</div>
    <a class="seller-card__links" href="/warszawa">Warszawa</a>
  </body>
</html>
`;
```

#### 5.2.6 Łączny seed dla Supabase CLI

**tests/fixtures/seed.sql:**
```sql
\i tests/fixtures/users.sql
\i tests/fixtures/offers.sql
\i tests/fixtures/price_history.sql
\i tests/fixtures/user_offer.sql
```

---

### 5.3 Database Seed Scripts

**scripts/seed-test-db.sh:**
```bash
#!/bin/bash
set -e

echo "Seeding test database (Supabase CLI)..."

supabase db seed --file tests/fixtures/seed.sql --db-url "${DATABASE_URL}"

echo "Seed complete!"
```

**scripts/reset-test-db.sh:**
```bash
#!/bin/bash
set -e

echo "Resetting test database (Supabase CLI)..."

supabase db reset --db-url "${DATABASE_URL}"

supabase db seed --file tests/fixtures/seed.sql --db-url "${DATABASE_URL}"

echo "Reset complete!"
```

---

### 5.4 External Dependencies Mocking

#### 5.4.1 Supabase Mock

**tests/mocks/supabase.ts:**
```typescript
import { vi } from 'vitest';

export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: {}, error: null })
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
  }
};
```

#### 5.4.2 OpenRouter Mock

**tests/mocks/openrouter.ts:**
```typescript
export const mockOpenRouterService = {
  sendChatCompletion: vi.fn().mockResolvedValue({
    id: 'test-completion-id',
    model: 'gpt-4o-mini',
    choices: [{
      message: {
        role: 'assistant',
        content: JSON.stringify({
          title: 'BMW Seria 3',
          imageUrl: 'https://image.jpg',
          price: 50000,
          currency: 'PLN',
          city: 'Warszawa',
          confidence: 0.95,
          selector: 'h3[data-testid="ad-price"]'
        })
      },
      finish_reason: 'stop',
      index: 0
    }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  }),
  parseAndValidateStructuredResponse: vi.fn()
};
```

#### 5.4.3 Fetch Mock (dla web scraping)

**tests/mocks/fetch.ts:**
```typescript
import { vi } from 'vitest';
import { VALID_OTOMOTO_HTML } from '../fixtures/otomoto-html';

global.fetch = vi.fn((url: string) => {
  if (url.includes('otomoto.pl')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(VALID_OTOMOTO_HTML)
    } as Response);
  }
  
  return Promise.reject(new Error('Network error'));
});
```

---

## 6. Harmonogram wykonania i priorytety

### 6.1 Fazy testowania

#### Faza 1: Infrastruktura i Unit Tests (Tydzień 1)

**Cel:** Zbudować fundament testów, pokryć krytyczne serwisy

**Zadania:**
1. **Setup środowiska** (Dzień 1-2)
   - Instalacja Vitest, Testing Library, Playwright
   - Konfiguracja vitest.config.ts, playwright.config.ts
   - Setup fixtures i mocks
   - Seed scripts dla test DB

2. **Unit tests: OfferService** (Dzień 3-4)
   - TC-SCRAPE-001 do TC-SCRAPE-005
   - TC-CALC-001 do TC-CALC-005
   - Mocking Supabase, OpenRouter, fetch
   - Target: 90% coverage dla offer.service.ts

3. **Unit tests: Pozostałe serwisy** (Dzień 5-6)
   - DashboardService (calculateSummary)
   - OpenRouterService (sendChatCompletion, retry)
   - Validators (auth.validators.ts)
   - Target: 85% coverage

4. **Unit tests: React Components** (Dzień 7)
   - OfferForm (validation, submit)
   - PriceHistoryChart (data rendering)
   - OfferCard (badge colors)
   - Target: 80% coverage

**Metryki sukcesu:**
- ✅ Wszystkie unit tests przechodzą
- ✅ Coverage ≥85% dla src/lib/
- ✅ CI/CD pipeline skonfigurowany

---

#### Faza 2: Integration Tests (Tydzień 2)

**Cel:** Testować API endpoints i integracje z DB

**Zadania:**
1. **API: Offers endpoints** (Dzień 1-3)
   - GET/POST /api/offers
   - GET/DELETE /api/offers/[id]
   - GET /api/offers/[id]/history
   - TC-LIMIT-001 do TC-LIMIT-004
   - TC-VAL-001 do TC-VAL-004

2. **API: Auth & Dashboard** (Dzień 4-5)
   - POST /api/auth/* (login, register, logout)
   - GET /api/dashboard
   - GET/POST /api/preferences
   - Middleware testing

3. **RLS Policies** (Dzień 6)
   - TC-RLS-001 do TC-RLS-004
   - Test z dwoma użytkownikami
   - Próby obejścia RLS

4. **Database Triggers** (Dzień 7)
   - check_offer_addition_limit (10/24h)
   - update_updated_at_column
   - Soft-delete mechanism

**Metryki sukcesu:**
- ✅ Wszystkie API endpoints mają testy
- ✅ RLS policies zweryfikowane
- ✅ Zero wycieków danych między userami

---

#### Faza 3: E2E Tests (Tydzień 3)

**Cel:** Testować pełne ścieżki użytkownika

**Zadania:**
1. **Journey 1: Rejestracja** (Dzień 1-2)
   - Landing page → register → verify email → login
   - Dodanie pierwszej oferty
   - Weryfikacja dashboardu

2. **Journey 2: Monitorowanie** (Dzień 3-4)
   - Dodawanie/usuwanie ofert
   - Szczegóły oferty (wykres, tabela)
   - Sprawdzenie statystyk

3. **Journey 3: Limity** (Dzień 5)
   - Dodanie 5 ofert → błąd przy 6-tej
   - Usunięcie + reaktywacja
   - 10 dodań/24h limit

4. **Journey 4: Ustawienia** (Dzień 6)
   - Zmiana hasła
   - Zmiana frequency
   - Usunięcie konta

5. **Responsywność i cross-browser** (Dzień 7)
   - Desktop/Tablet/Mobile
   - Chrome/Firefox/Safari

**Metryki sukcesu:**
- ✅ Wszystkie kluczowe journey działają
- ✅ Zero błędów w konsoli przeglądarki
- ✅ Pass rate ≥95% w CI

---

#### Faza 4: Performance & Security (Tydzień 4)

**Cel:** Zapewnić wydajność i bezpieczeństwo

**Zadania:**
1. **Load Testing** (Dzień 1-2)
   - k6 scenarios dla dashboard, offers list, add offer
   - Database query optimization (EXPLAIN ANALYZE)
   - Cron job performance test

2. **Security Testing** (Dzień 3-5)
   - OWASP Top 10 checklist
   - JWT manipulation attempts
   - SQL injection tests (parametrized queries)
   - XSS attempts (React auto-escape)
   - Penetration testing (manual)

3. **Monitoring Setup** (Dzień 6-7)
   - Error tracking (Sentry)
   - Real User Monitoring (LogRocket)
   - APM dla DB queries
   - Alerting rules

**Metryki sukcesu:**
- ✅ p95 response times < 500ms (dashboard)
- ✅ Zero security vulnerabilities (OWASP)
- ✅ 90% scraping success rate

---

### 6.2 Testowanie ścieżki krytycznej (Critical Path)

**Must-Pass Tests przed deployment:**

1. **🔴 TC-SCRAPE-001:** Cheerio extraction success
2. **🔴 TC-SCRAPE-003:** LLM fallback działa
3. **🔴 TC-LIMIT-001:** 5 ofert limit enforced
4. **🔴 TC-RLS-001:** Izolacja ofert użytkowników
5. **🔴 TC-CRON-001:** Cron job pobiera active offers
6. **🔴 TC-CRON-004:** Price history insert
7. **🔴 TC-AUTH-001:** Login flow działa
8. **🔴 E2E-Journey-1:** Rejestracja → dodanie oferty
9. **🔴 Performance:** p95 < 500ms dla GET /api/offers
10. **🔴 Security:** RLS policies działają (zero data leaks)

**Blocking Criteria:**
- Jeśli którykolwiek z powyższych testów fails → **BLOCK deployment**
- Success rate testów E2E < 95% → **BLOCK deployment**
- Security vulnerability (OWASP) → **BLOCK deployment**

---

### 6.3 CI/CD Integration

**Pull Request Checks:**
```yaml
required_status_checks:
  - Unit Tests (Vitest)
  - Integration Tests (API)
  - Lint & Format
  - Build Success
```

**Pre-deployment Checks (Staging):**
```yaml
required_checks:
  - All Unit + Integration Tests Pass
  - E2E Tests Pass (≥95%)
  - Coverage ≥80%
  - Security Scan (npm audit)
  - Performance Tests Pass
```

**Production Deployment:**
```yaml
smoke_tests:
  - GET /api/dashboard (200 OK)
  - POST /api/auth/login (valid credentials)
  - GET / (landing page loads)
  
rollback_criteria:
  - Error rate > 5%
  - p99 latency > 3s
  - Any critical path test fails
```

---

### 6.4 Continuous Monitoring

**Metryki do śledzenia w production:**

1. **Scraping Success Rate**
   - Target: ≥90%
   - Alert: <85% przez 1h

2. **API Response Times**
   - p50: <200ms
   - p95: <500ms
   - p99: <1s

3. **Error Rates**
   - 4xx errors: <2%
   - 5xx errors: <0.5%

4. **Cron Job Success**
   - Target: 95% ofert processed successfully
   - Alert: <90%

5. **User Experience**
   - Page load time (LCP): <2.5s
   - First Input Delay: <100ms
   - Cumulative Layout Shift: <0.1

**Dashboards:**
- Grafana: Database queries, API latency
- Sentry: Error tracking, release health
- Supabase Dashboard: RLS policy usage, auth metrics

---

### 6.5 Test Maintenance Schedule

**Tygodniowo:**
- Review flaky tests (>2 failures/tydzień)
- Update fixtures jeśli zmiany w DB schema
- Check npm audit dla security updates

**Co 2 tygodnie:**
- Review test coverage (czy spada?)
- Update Playwright/Vitest do latest
- Scraping tests z prawdziwym Otomoto.pl (verify selectors)

**Miesięcznie:**
- Full regression suite w staging
- Performance baseline update
- Security penetration testing

**Co kwartał:**
- Analiza test debt (testy do refaktoryzacji)
- Update test strategy (nowe funkcjonalności)
- Training team na best practices

---

## Podsumowanie

Plan testów dla PriceHistory MVP zapewnia:

✅ **90% skuteczność scraping** (cel biznesowy)  
✅ **Zero data leaks** (RLS policies coverage)  
✅ **Niezawodne API** (integration tests)  
✅ **Bezpieczne uwierzytelnianie** (OWASP Top 10)  
✅ **Wydajność** (load testing, p95 < 500ms)  
✅ **Automatyzację** (CI/CD pipeline)  
✅ **Monitorowanie** (production metrics)

**Szacowany czas implementacji:** 4 tygodnie (1 osoba full-time)  
**ROI:** Redukcja bugów w produkcji o 70%, confidence w deployments 95%

</test_plan>