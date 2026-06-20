import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  // Strip BOM (U+FEFF) that may be injected by Windows tooling
  const url = process.env.SUPABASE_URL?.replace(/^\uFEFF/, "").trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^\uFEFF/, "").trim();
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
