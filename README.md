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

## Project Status

🚧 **MVP in active development** 🚧  
Features defined in the Product Requirements Document are being implemented. Contributions and issue reports are welcome!

---

## License

No license has been specified. Please add a `LICENSE` file (e.g., MIT License) to clarify terms of use.
