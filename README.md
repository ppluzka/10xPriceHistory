# PriceHistory

A web application for tracking and visualizing price history of car listings on Otomoto.pl. PriceHistory automatically monitors selected offers, stores historical data, and renders interactive charts so users can make informed purchasing decisions.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Status](#project-status)
5. [Implemented Features](#implemented-features)
6. [Known Limitations](#known-limitations)
7. [API Documentation](#api-documentation)
8. [Project Scope (MVP)](#project-scope-mvp)
9. [License](#license)

---

## Tech Stack

**Frontend**

- Astro 5 with SSR
- React 19 for interactive components
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui component library
- Recharts for data visualization

**Backend**

- Supabase (PostgreSQL + BaaS)
  - Supabase Authentication
  - Supabase SDK
  - Row-Level Security (RLS)

**AI & Scraping**

- OpenRouter.ai (GPT-4o-mini, Claude Haiku) for AI-powered data extraction
- Cheerio.js for HTML parsing
- User-Agent rotation and 2–5s request delays

**Testing**

- Vitest for unit and integration tests
- Testing Library (React) for component testing
- Playwright for E2E testing
- MSW (Mock Service Worker) for API mocking

**Infrastructure**

- VPS hosting
- CI/CD via GitHub Actions
- Scheduled jobs with `pg_cron` in Supabase

---

## Getting Started Locally

### Prerequisites

- Node.js 22.14.0 (managed via .nvmrc)
- Git
- Supabase account and project
- OpenRouter.ai API key

### Setup

```bash
# Clone the repository
git clone https://github.com/ppluzka/10xPriceHistory
cd 10xPriceHistory

# Install Node version
nvm install

# Copy environment example and configure values
cp .env.example .env
# Edit .env to add your Supabase URL, Supabase Key, OpenRouter API key, etc.

# Install dependencies
npm install

# Run database migrations (if applicable)
# See Supabase dashboard for migration execution
```

### Run

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## Available Scripts

All commands are run from the project root:

- `npm run dev`  
  Starts Astro in development mode with hot-reload.

- `npm run build`  
  Builds the site for production.

- `npm run preview`  
  Serves the production build locally.

- `npm run astro`  
  Shortcut for running the Astro CLI.

- `npm run lint`  
  Runs ESLint on all `.ts`, `.tsx`, and `.astro` files.

- `npm run lint:fix`  
  Runs ESLint with auto-fix.

- `npm run format`  
  Runs Prettier to format code and markdown.

- `npm run test`  
  Runs unit and integration tests with Vitest.

- `npm run test:ui`  
  Opens Vitest UI for interactive test debugging.

- `npm run test:coverage`  
  Runs tests with coverage report.

- `npm run test:e2e`  
  Runs E2E tests with Playwright.

---

## Project Status

✅ **MVP: ~85% Complete**

Core functionality is implemented and functional. The application supports user authentication, offer management, automated price monitoring, and data visualization. Some edge cases and polish features remain (see [Known Limitations](#known-limitations)).

**Current Status:**
- ✅ Core features implemented
- ✅ Production-ready architecture
- ⚠️ Some security enhancements pending
- ⚠️ Onboarding and polish features pending

---

## Implemented Features

### Authentication & User Management

- ✅ User registration with email verification
- ✅ Login/logout with session management
- ✅ Password reset flow
- ✅ Email verification with resend capability
- ✅ Protected routes with middleware
- ✅ Account settings page
- ✅ Password change functionality
- ✅ Account deletion (soft delete)

### Offer Management

- ✅ Add offers from Otomoto.pl URLs
- ✅ URL validation (otomoto.pl domain only)
- ✅ AI-powered data extraction (OpenRouter)
- ✅ Fallback CSS selector extraction
- ✅ View list of active offers
- ✅ Soft-delete offers (preserves history)
- ✅ Offer detail pages with full history
- ✅ Rate limiting: 5 active offers, 10 additions per 24h

### Price Monitoring

- ✅ Automated price checking via cron endpoint
- ✅ Configurable check frequency (6h, 12h, 24h, 48h)
- ✅ Retry logic for failed extractions
- ✅ Status management (active, error, removed)
- ✅ 404/410 detection for removed offers
- ✅ Price anomaly detection (>50% change warnings)

### Data Visualization

- ✅ Interactive line charts (Recharts)
- ✅ Price history table
- ✅ Percent change calculations (from first/previous)
- ✅ Color-coded badges (green for drops, red for increases)
- ✅ Offer statistics (min, max, avg, trend)
- ✅ Dashboard with global statistics
- ✅ Responsive design (mobile-friendly)

### API Endpoints

- ✅ `GET /api/offers` - List offers with pagination
- ✅ `POST /api/offers` - Add new offer
- ✅ `GET /api/offers/[id]` - Get offer details
- ✅ `GET /api/offers/[id]/history` - Get price history
- ✅ `POST /api/offers/[id]/recheck` - Manual price check
- ✅ `GET /api/dashboard` - Dashboard summary
- ✅ `POST /api/cron/check-prices` - Automated price checking
- ✅ `GET /api/preferences` - User preferences
- ✅ `PUT /api/preferences` - Update preferences
- ✅ Authentication endpoints (login, register, logout, etc.)

---

## Known Limitations

The following features from the PRD are not yet fully implemented:

### Security & Rate Limiting

- ⚠️ **Captcha on registration** - Not implemented (hCaptcha/Turnstile)
- ⚠️ **IP-based registration limiting** - Max 3 registrations per IP/day not enforced
- ⚠️ **Manual check rate limit** - 1 check per offer per hour not enforced

### User Experience

- ⚠️ **Onboarding tooltips** - First-time user guidance not implemented
- ⚠️ **Enhanced landing page** - Basic landing exists, missing full content sections (Hero, Problem/Solution, Features, Pricing, FAQ)

### Monitoring & Alerts

- ⚠️ **Error alert system** - Monitoring logic exists, but email/webhook alerts for >15% error rate not configured
- ⚠️ **Advanced retry delays** - Retry exists but may not match exact PRD spec (1min, 5min, 15min)

### Configuration

- ⚠️ **AI confidence threshold** - Code uses 0.8, PRD specifies 0.9 minimum

---

## API Documentation

### Authentication

API endpoints use **session-based authentication** via Supabase Auth cookies. The authentication is handled automatically by the middleware.

**How it works:**

1. **Browser-based requests**: Cookies are automatically included with requests
2. **Middleware validation**: Each request is validated by `src/middleware/index.ts`
3. **User context**: Authenticated user ID is available in `locals.current_user_id`
4. **Unauthorized requests**: Return `401 Unauthorized` if no valid session

**For programmatic access (e.g., curl, Postman):**

You need to include the Supabase session cookies. After logging in via the web interface, extract the cookies from your browser's developer tools and include them in requests:

```bash
# Example with cookies (replace with actual session cookies)
curl http://localhost:4321/api/offers \
  -H "Cookie: sb-<project-ref>-auth-token=..."
```

**Special case - CRON endpoint:**

The `/api/cron/check-prices` endpoint uses **Bearer token authentication** instead of session cookies:

```bash
curl -X POST http://localhost:4321/api/cron/check-prices \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by": "pg_cron"}'
```

**Public endpoints** (no authentication required):

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/resend-verification`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`

---

### GET /api/offers

Returns a paginated list of active offer subscriptions for the user.

**Query Parameters:**

| Parameter | Type   | Required | Default      | Description                                        |
| --------- | ------ | -------- | ------------ | -------------------------------------------------- |
| `page`    | number | No       | `1`          | Page number (must be ≥1)                           |
| `size`    | number | No       | `10`         | Items per page (must be ≥1 and ≤100)               |
| `sort`    | string | No       | `created_at` | Sort column: `created_at`, `last_checked`, `title` |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "BMW 320d 2015",
      "url": "https://otomoto.pl/...",
      "imageUrl": "https://...",
      "city": "Warszawa",
      "status": "active",
      "lastChecked": "2025-10-14T12:00:00Z",
      "currentPrice": 45000.0,
      "currency": "PLN",
      "percentChangeFromFirst": -5.2,
      "percentChangeFromPrevious": 1.1
    }
  ],
  "page": 1,
  "size": 10,
  "total": 42
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters (with validation details)
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Unexpected server error

**Example Usage:**

```bash
# Get first page with default settings (requires authentication)
# In browser: Cookies are automatically included
# For curl: Include session cookies from browser after login
curl http://localhost:4321/api/offers \
  -H "Cookie: sb-<project-ref>-auth-token=<session-token>"

# Get second page with 20 items, sorted by last checked
curl "http://localhost:4321/api/offers?page=2&size=20&sort=last_checked" \
  -H "Cookie: sb-<project-ref>-auth-token=<session-token>"
```

**Note**: For browser-based requests, cookies are automatically included. For programmatic access, you need to extract the session cookie from your browser after logging in.

---

### POST /api/offers

Adds a new Otomoto.pl offer subscription for the authenticated user. The endpoint automatically extracts offer data (title, image, price, location) from the provided URL.

**Request Body:**

```json
{
  "url": "https://otomoto.pl/..."
}
```

**Response (201 Created):**

```json
{
  "id": 123,
  "message": "Offer added"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid URL, not from otomoto.pl domain, or data extraction failed
- `401 Unauthorized` - Authentication required
- `409 Conflict` - Offer URL already subscribed by the user
- `429 Too Many Requests` - Rate limit exceeded (max 5 active subscriptions or 10 additions per 24h)
- `500 Internal Server Error` - Unexpected server error

**Business Logic:**

1. **Rate Limiting:**
   - Maximum 5 active subscriptions per user
   - Maximum 10 offer additions per 24 hours (enforced by database trigger)

2. **Duplicate Handling:**
   - If user already has an active subscription to this URL → `409 Conflict`
   - If user previously deleted this subscription → reactivates it and returns `201`
   - If offer exists but is assigned to other users → creates new subscription, user sees price history from this point forward

3. **Data Extraction:**
   - Fetches HTML from the URL (30-second timeout)
   - Uses AI-powered extraction (OpenRouter) with fallback to CSS selectors
   - Extracts: title, image, price, currency, city
   - Validates extracted data (price must be between 0 and 10,000,000)

**Example Usage:**

```bash
# Add new offer subscription (requires authentication)
curl -X POST http://localhost:4321/api/offers \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-<project-ref>-auth-token=<session-token>" \
  -d '{"url": "https://otomoto.pl/osobowe/bmw/seria-3/..."}'
```

**Note**: In browser-based requests, cookies are automatically included. Extract session cookies from your browser after logging in for programmatic access.

---

### GET /api/offers/[id]/history

Returns paginated price history for a specific offer.

**Path Parameters:**

- `id` - Offer ID (positive integer)

**Query Parameters:**

| Parameter | Type   | Required | Default | Description                              |
| --------- | ------ | -------- | ------- | ---------------------------------------- |
| `page`    | number | No       | `1`     | Page number (must be ≥1)                 |
| `size`    | number | No       | `10`    | Items per page (must be ≥1 and ≤1000)    |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "price": 45000.0,
      "currency": "PLN",
      "checkedAt": "2025-10-14T12:00:00Z"
    }
  ],
  "page": 1,
  "size": 10,
  "total": 42
}
```

**Error Responses:**

- `400 Bad Request` - Invalid offer ID or query parameters
- `401 Unauthorized` - Authentication required (no valid session)
- `404 Not Found` - Offer not found or user not subscribed
- `500 Internal Server Error` - Unexpected server error

**Example Usage:**

```bash
# Get price history for offer ID 123
curl "http://localhost:4321/api/offers/123/history?page=1&size=10" \
  -H "Cookie: sb-<project-ref>-auth-token=<session-token>"
```

---

### GET /api/dashboard

Returns dashboard summary with statistics and list of offers.

**Response (200 OK):**

```json
{
  "summary": {
    "activeCount": 5,
    "avgChange": -2.5,
    "largestDrop": -8.3,
    "largestRise": 3.1
  },
  "offers": [
    {
      "id": 1,
      "title": "BMW 320d 2015",
      "currentPrice": 45000.0,
      "percentChangeFromFirst": -5.2,
      "status": "active"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Authentication required (no valid session)
- `500 Internal Server Error` - Unexpected server error

**Example Usage:**

```bash
# Get dashboard data (requires authentication)
curl http://localhost:4321/api/dashboard \
  -H "Cookie: sb-<project-ref>-auth-token=<session-token>"
```

---

### POST /api/cron/check-prices

Scheduled endpoint for automated price checking. Called by `pg_cron` or external scheduler.

**Headers:**

- `Authorization: Bearer <CRON_SECRET>` - Required for authentication

**Request Body:**

```json
{
  "triggered_by": "pg_cron"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "processed": 42,
  "message": "Price check completed successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing CRON_SECRET
- `500 Internal Server Error` - Processing failed

**Authentication:**

This endpoint uses **Bearer token authentication** instead of session cookies because it's called by external schedulers (e.g., pg_cron).

**Example Usage:**

```bash
# Trigger price check (requires CRON_SECRET)
curl -X POST http://localhost:4321/api/cron/check-prices \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by": "pg_cron"}'
```

**Note**: `CRON_SECRET` must be set in environment variables and match the value sent in the Authorization header.

---

## Project Scope (MVP)

This repository implements the core MVP features as defined in the Product Requirements Document:

- ✅ Support for tracking only Otomoto.pl listings
- ✅ User authentication (email/password) via Supabase Auth
- ✅ Email verification workflow
- ✅ Add, view, and soft-delete up to **5** active offers (free tier)
- ✅ Rate limiting: 10 offer additions per 24 hours
- ✅ Automatic price monitoring via scheduled cron jobs (configurable frequency: 6h, 12h, 24h, 48h)
- ✅ AI-powered price extraction on first offer addition with fallback selectors
- ✅ Storage of price history (30-day retention for free tier)
- ✅ Responsive line charts showing price trends with tooltips
- ✅ Grid-based dashboard with price change badges (green for drops, red for increases)
- ✅ Offer detail pages with statistics and history
- ✅ User settings (password change, check frequency, account deletion)

**See [Known Limitations](#known-limitations) for features not yet implemented.**

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
