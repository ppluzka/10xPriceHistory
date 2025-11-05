# PriceHistory

A web application for tracking and visualizing price history of car listings on Otomoto.pl. PriceHistory automatically monitors selected offers, stores historical data, and renders interactive charts so users can make informed purchasing decisions.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Scope (MVP)](#project-scope-mvp)
5. [Project Status](#project-status)
6. [License](#license)

---

## Tech Stack

**Frontend**

- Astro 5 with SSR
- React 19 for interactive components
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui component library
- Recharts or Chart.js for data visualization

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

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/PriceHistory.git
cd PriceHistory

# Install Node version
nvm install

# Copy environment example and configure values
cp .env.example .env
# Edit .env to add your Supabase URL, Supabase Key, OpenRouter API key, etc.

# Install dependencies
npm install
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

## Project Scope (MVP)

This repository implements the core MVP features:

- Support for tracking only Otomoto.pl listings
- User authentication (email/password) via Supabase Auth
- Add, view, and soft-delete up to **5** active offers (free tier)
- Automatic price monitoring on a global schedule (default: 24 h)
- AI-powered price extraction on first offer addition with fallback selectors
- Storage of price history for **30 days**
- Responsive line charts showing price trends and tooltips
- Grid-based dashboard with price change badges (green for drops, red for increases)

---

## API Documentation

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
- `500 Internal Server Error` - Unexpected server error

**Example Usage:**

```bash
# Get first page with default settings
curl http://localhost:4321/api/offers

# Get second page with 20 items, sorted by last checked
curl "http://localhost:4321/api/offers?page=2&size=20&sort=last_checked"
```

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
   - Fetches HTML from the URL (10-second timeout)
   - Extracts: title, image, price, currency, city using CSS selectors
   - Supports multiple selector fallbacks for robustness
   - Validates extracted data (price must be between 0 and 10,000,000)

**Example Usage:**

```bash
# Add new offer subscription
curl -X POST http://localhost:4321/api/offers \
  -H "Content-Type: application/json" \
  -d '{"url": "https://otomoto.pl/osobowe/bmw/seria-3/..."}'

# Response
{
  "id": 123,
  "message": "Offer added"
}
```

---

## Project Status

🚧 **MVP in active development** 🚧  
Features defined in the Product Requirements Document are being implemented. Contributions and issue reports are welcome!

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
