/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
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
