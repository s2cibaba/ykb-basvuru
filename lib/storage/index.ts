import { createKvDb } from "./kv-db";
import type { StorageAdapter } from "./types";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export async function getStorage(): Promise<StorageAdapter> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as { APP_STORE?: KvBinding }).APP_STORE;
    if (kv) return createKvDb(kv);
  } catch {
    // Local Next.js dev without Cloudflare runtime
  }
  const { jsonDb } = await import("./json-db");
  return jsonDb;
}

export * from "./types";
