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
    if (!raw) return { ...EMPTY_STORE };
    return normalizeStore(JSON.parse(raw) as Partial<Store>);
  }

  async function writeStore(store: Store): Promise<void> {
    await kv.put(STORE_KEY, JSON.stringify(store));
  }

  return createStoreAdapter({ readStore, writeStore });
}
