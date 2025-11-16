# Cloudflare Pages Setup Guide

This document outlines the changes made to support Cloudflare Pages deployment and the steps needed to deploy.

## Changes Made

### 1. Environment Variable Utilities

Created `src/lib/utils/env.ts` with utilities for accessing environment variables that work both locally and on Cloudflare Pages:

- `getEnv(context, key)` - Gets an environment variable, trying Cloudflare runtime first, then falling back to `import.meta.env`
- `getEnvRequired(context, key)` - Same as `getEnv` but throws if the variable is not set

### 2. OpenRouter Service Utilities

Created `src/lib/utils/openrouter.ts` with helper functions:

- `createOpenRouterService(context)` - Creates an OpenRouter service instance with Cloudflare Pages compatibility
- `createOpenRouterServiceOrNull(context)` - Same but returns null if API key is not set (for test environments)

### 3. Updated API Routes

All API routes have been updated to use the new environment variable utilities:

- `src/pages/api/dashboard.ts`
- `src/pages/api/llm.ts`
- `src/pages/api/offers.ts`
- `src/pages/api/offers/[id].ts`
- `src/pages/api/offers/[id]/history.ts`
- `src/pages/api/offers/[id]/recheck.ts`
- `src/pages/api/cron/check-prices.ts`

### 4. Updated Supabase Client

The `createSupabaseServiceRoleClient()` function now accepts an optional context parameter to access Cloudflare runtime environment variables.

### 5. Updated Environment Variable Types

Updated `src/env.d.ts` to include all environment variables used in the application:

- `SUPABASE_URL` (required)
- `SUPABASE_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (optional, for CRON jobs)
- `ENV_NAME` (optional)
- `OPENROUTER_API_KEY` (optional)
- `OPENROUTER_BASE_URL` (optional)
- `OPENROUTER_DEFAULT_MODEL` (optional)
- `OPENROUTER_TIMEOUT_MS` (optional)
- `OPENROUTER_MAX_RETRIES` (optional)
- `CRON_SECRET` (optional)
- `ALERT_WEBHOOK_URL` (optional)
- `HCAPTCHA_SITE_KEY` (optional)
- `HCAPTCHA_SECRET_KEY` (optional)

### 6. Updated Preview Script

Updated `package.json` preview script to use Wrangler for Cloudflare Pages:

```json
"preview": "wrangler pages dev ./dist"
```

## Deployment Steps

### 1. Configure Environment Variables in Cloudflare Pages

In your Cloudflare Pages dashboard, go to Settings → Environment Variables and add all required environment variables:

**Required:**
- `SUPABASE_URL`
- `SUPABASE_KEY`

**Optional (but recommended for full functionality):**
- `SUPABASE_SERVICE_ROLE_KEY` (for CRON jobs)
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_DEFAULT_MODEL`
- `OPENROUTER_TIMEOUT_MS`
- `OPENROUTER_MAX_RETRIES`
- `CRON_SECRET`
- `ALERT_WEBHOOK_URL`
- `ENV_NAME` (set to "production")
- `HCAPTCHA_SITE_KEY`
- `HCAPTCHA_SECRET_KEY`

### 2. Build and Deploy

The project is already configured with the Cloudflare adapter. Build and deploy as usual:

```bash
npm run build
```

Then deploy to Cloudflare Pages through:
- GitHub integration (automatic deployments)
- Wrangler CLI: `wrangler pages deploy ./dist`
- Cloudflare dashboard

### 3. Configure CRON Jobs

If you're using CRON jobs (e.g., `/api/cron/check-prices`), you'll need to:

1. Set up scheduled triggers in Cloudflare Pages (if supported) or use external CRON services
2. Configure the `CRON_SECRET` environment variable
3. Update CRON job URLs to point to your Cloudflare Pages domain

### 4. Test Locally with Wrangler

You can test the Cloudflare Pages setup locally using:

```bash
npm run build
npm run preview
```

This will start Wrangler Pages dev server with access to Cloudflare bindings and environment variables.

## How It Works

### Local Development

- Environment variables are accessed via `import.meta.env` (standard Astro behavior)
- Works with `.env` files and standard Astro environment variable handling

### Cloudflare Pages

- Server-side code (API routes, SSR pages) accesses environment variables via `Astro.locals.runtime.env`
- Client-side code continues to use `import.meta.env`
- The utility functions automatically handle the fallback

## Reference

- [Astro Cloudflare Adapter Documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#environment-variables-and-secrets)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

