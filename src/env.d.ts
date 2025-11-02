/// <reference types="astro/client" />

declare global {
  namespace App {
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
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
