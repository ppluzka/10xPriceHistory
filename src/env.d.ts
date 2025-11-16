/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly ENV_NAME?: "local" | "integration" | "production";
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_DEFAULT_MODEL?: string;
  readonly OPENROUTER_TIMEOUT_MS?: string;
  readonly OPENROUTER_MAX_RETRIES?: string;
  readonly CRON_SECRET?: string;
  readonly ALERT_WEBHOOK_URL?: string;
  readonly HCAPTCHA_SITE_KEY?: string;
  readonly HCAPTCHA_SECRET_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: import("./db/supabase.client.ts").SupabaseClient;
    current_user_id: string | null;
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
    } | null;
  }
}
