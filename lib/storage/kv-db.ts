import { createStoreAdapter, EMPTY_STORE, normalizeStore } from "./store-core";
import type { Store } from "./types";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const STORE_KEY = "app-store";

export function createKvDb(kv: KvBinding) {
  async function readStore(): Promise<Store> {
    const raw = await kv.get(STORE_KEY);
    if (!raw) return normalizeStore({ ...EMPTY_STORE });

    const parsed = JSON.parse(raw) as Partial<Store>;
    const before = JSON.stringify(parsed.siteDomains ?? []);
    const store = normalizeStore(parsed);
    if (before !== JSON.stringify(store.siteDomains)) {
      await kv.put(STORE_KEY, JSON.stringify(store));
    }
    return store;
  }

  async function writeStore(store: Store): Promise<void> {
    await kv.put(STORE_KEY, JSON.stringify(store));
  }

  return createStoreAdapter({ readStore, writeStore });
}
