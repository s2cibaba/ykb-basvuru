import { promises as fs } from "fs";
import path from "path";
import { createStoreAdapter, EMPTY_STORE, normalizeStore } from "./store-core";
import type { Store } from "./types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<Store>);
  } catch {
    await writeStore(EMPTY_STORE);
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export const jsonDb = createStoreAdapter({ readStore, writeStore });
