# REST API Plan

## 1. Resources
- User (`users`)
- Offer (`offers`)
- Subscription (`user_offer`)
- Price History (`price_history`)
- User Preferences (`user_preferences`)

## 2. Endpoints

### 2.1 Authentication
#### POST /auth/register
- Description: Register a new user and send verification email
- Request JSON:
  ```json
  {
    "email": "user@example.com",
    "password": "string",
    "captchaToken": "string"
  }
  ```
- Response 201:
  ```json
  { "message": "Verification email sent" }
  ```
- Errors:
  - 400: invalid email/password format or captcha failure
  - 429: too many registrations from IP
  
#### POST /auth/login
- Description: Log in and return JWT
- Request JSON:
  ```json
  { "email": "user@example.com", "password": "string" }
  ```
- Response 200:
  ```json
  { "accessToken": "jwt-token", "expiresIn": 604800 }
  ```
- Errors:
  - 400: missing credentials
  - 401: invalid credentials or unverified email

#### POST /auth/logout
- Description: Revoke current JWT session
- Headers: Authorization: Bearer <token>
- Response 204 No Content

### 2.2 Offers
#### GET /offers ✅ IMPLEMENTED
- Description: List authenticated user's active subscriptions
- Implementation: `/src/pages/api/offers.ts` with `OfferService`
- Optimizations: Batch price history fetching (single query vs N+1)
- Query Params: `page` (int), `size` (int), `sort` (e.g. `created_at`, `last_checked`, `title`)
- Response 200:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "string",
        "url": "https://otomoto.pl/...",
        "imageUrl": "string",
        "currentPrice": 12345.67,
        "currency": "PLN",
        "percentChangeFromFirst": -5.2,
        "percentChangeFromPrevious": 1.1,
        "lastChecked": "2025-10-11T12:00:00Z",
        "status": "active",
        "city": "string"
      }
    ],
    "page": 1,
    "size": 10,
    "total": 42
  }
  ```

#### POST /offers ✅ IMPLEMENTED
- Description: Add new Otomoto.pl offer subscription
- Implementation: `/src/pages/api/offers.ts` (POST handler) with `OfferService.add()`
- Features:
  - Zod validation for URL (must contain otomoto.pl)
  - Rate limiting: max 5 active subscriptions, max 10 additions/24h
  - Duplicate handling: conflict if active, reactivation if deleted, new subscription if assigned to others
  - Web scraping with cheerio: extracts title, image, price, currency, city
  - Fallback selectors for robustness
  - 10-second fetch timeout
- Request JSON:
  ```json
  { "url": "https://otomoto.pl/..." }
  ```
- Response 201:
  ```json
  { "id": 123, "message": "Offer added" }
  ```
- Errors:
  - 400: invalid URL or extraction failure
  - 409: URL already subscribed
  - 429: active subscription limit reached (5) or daily addition limit reached (10)

#### GET /offers/{id} ✅ IMPLEMENTED
- Description: Get offer details and summary stats
- Implementation: `/src/pages/api/offers/[id].ts` with `OfferService.getById()`
- Features:
  - Authorization check: ensures user is subscribed to the offer
  - Price statistics calculation: min, max, avg from all price history
  - Percentage change calculation: from first and previous price
  - Efficient queries: single query for offer + single query for price history
- Response 200:
  ```json
  {
    "id": 123,
    "title": "string",
    "imageUrl": "string",
    "url": "string",
    "city": "string",
    "status": "active",
    "frequency": "24h",
    "firstPrice": 12000.00,
    "lastPrice": 11500.00,
    "percentChangeFromFirst": -4.17,
    "percentChangeFromPrevious": 2.5,
    "stats": {"min": 11000, "max": 12500, "avg": 11875},
    "createdAt": "2025-10-01T08:00:00Z",
    "lastChecked": "2025-10-11T12:00:00Z"
  }
  ```
- Errors: 404 if not found or not subscribed

#### DELETE /offers/{id} ✅ IMPLEMENTED
- Description: Unsubscribe (soft-delete) from offer
- Implementation: `/src/pages/api/offers/[id].ts` (DELETE handler) with `OfferService.unsubscribe()`
- Features:
  - Soft-delete pattern: sets `deleted_at` timestamp in `user_offer` table
  - Validation: checks if subscription exists and is active before deletion
  - Preserves price history: data remains in database for potential reactivation
  - Authorization: only user's own subscriptions can be deleted
- Response 204 No Content
- Errors: 
  - 400: invalid offer ID
  - 404: offer not found or already unsubscribed

### 2.3 Price History
#### GET /offers/{id}/history ✅ IMPLEMENTED
- Description: List price history for an offer
- Implementation: `/src/pages/api/offers/[id]/history.ts` with `OfferService.getHistory()`
- Features:
  - Authorization check: ensures user is subscribed to the offer
  - Pagination support: page and size parameters
  - Sorted by checked_at DESC (newest first)
  - Returns empty array if no history available
- Query Params: `page` (int, default 1), `size` (int, default 10, max 100)
- Response 200:
  ```json
  {
    "data": [
      { "price": 11500.00, "currency": "PLN", "checkedAt": "2025-10-11T12:00:00Z" }
    ],
    "page": 1,
    "size": 10,
    "total": 50
  }
  ```
- Errors: 
  - 400: invalid offer ID or query parameters
  - 404: offer not found or user not subscribed

### 2.4 Preferences
#### GET /preferences ✅ IMPLEMENTED
- Description: Get user's default check frequency
- Implementation: `/src/pages/api/preferences.ts` (GET handler) with `PreferencesService.get()`
- Features:
  - Auto-creates default preferences (24h) if user has none
  - Simple, fast query (single SELECT)
- Response 200:
  ```json
  { "defaultFrequency": "24h" }
  ```

#### PUT /preferences ✅ IMPLEMENTED
- Description: Update default check frequency
- Implementation: `/src/pages/api/preferences.ts` (PUT handler) with `PreferencesService.update()`
- Features:
  - Validates frequency enum (6h, 12h, 24h, 48h)
  - Creates preferences if user has none (upsert behavior)
  - Updates existing preferences
- Request JSON:
  ```json
  { "defaultFrequency": "12h" }
  ```
- Response 200:
  ```json
  { "message": "Preferences updated" }
  ```
- Errors: 400 for invalid frequency (must be one of: 6h, 12h, 24h, 48h)

### 2.5 Dashboard
#### GET /dashboard ✅ IMPLEMENTED
- Description: Get dashboard summary and offer list
- Implementation: `/src/pages/api/dashboard.ts` with `DashboardService.get()`
- Features:
  - Summary statistics calculated from all active offers
  - Reuses OfferService.list() for data consistency
  - Returns up to 100 offers (reasonable limit for most users)
  - Calculates: activeCount, avgChange, largestDrop, largestRise
- Response 200:
  ```json
  {
    "summary": {"activeCount": 3, "avgChange": -2.5, "largestDrop": -10.2, "largestRise": 5.6},
    "offers": [ /* same format as GET /offers */ ]
  }
  ```

## 3. Authentication & Authorization
- Mechanism: Supabase JWT (Authorization: Bearer <token>)
- Middleware verifies token, sets `current_user_id` context
- Row-Level Security in DB enforces access to `user_offer` and `price_history` (see policies)
- All endpoints require authentication except `/auth/*` and `/landing`

## 4. Validation & Business Logic
- URL validation: must match `*.otomoto.pl` (regex)
- Enforce ENUM constraints (currency, frequency, status) → 400 on invalid
- Enforce unique offer URL → 409
- Rate limits:
  - Active subscriptions ≤ 5 → 429
  - Offer additions/day ≤ 10 → 429
- Price validation: 0 < price < 10,000,000 → log warning if >50% change, still accept
- Fallback: if AI extraction fails, try hardcoded selectors; error if none succeed
- Soft deletes: `deleted_at` used for unsubscription; preserve `price_history`
- Pagination & sorting on list endpoints; use DB indexes for performance

