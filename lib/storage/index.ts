import { createSupabaseDb } from "./supabase-db";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { StorageAdapter } from "./types";

export async function getStorage(): Promise<StorageAdapter> {
  // Vercel / Supabase ortamında direkt Supabase
  if (isSupabaseConfigured()) {
    try {
      return createSupabaseDb();
    } catch {
      // Supabase bağlantı hatası → fallback to local JSON
    }
  }

  // Son çare: local JSON dosyası (dev)
  const { jsonDb } = await import("./json-db");
  return jsonDb;
}

export * from "./types";
