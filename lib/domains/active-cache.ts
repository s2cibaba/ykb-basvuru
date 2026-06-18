const CACHE_KEY = "active_hostname";
const BLOCKED_KEY = "blocked_hostnames";

const OFFER_HOST_KEY = "offer_hostname";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

async function getKv(): Promise<KvBinding | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return (env as { APP_STORE?: KvBinding }).APP_STORE ?? null;
  } catch {
    return null;
  }
}

export async function getCachedActiveHostname(): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  return await kv.get(CACHE_KEY);
}

export async function setCachedActiveHostname(hostname: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.put(CACHE_KEY, hostname.toLowerCase());
}

export async function setCachedBlockedHostnames(hostnames: string[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.put(BLOCKED_KEY, JSON.stringify(hostnames));
}

export async function getCachedOfferHostname(): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  return await kv.get(OFFER_HOST_KEY);
}

export async function setCachedOfferHostname(hostname: string): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.put(OFFER_HOST_KEY, hostname.toLowerCase());
}

export async function getCachedBlockedHostnames(): Promise<string[]> {
  const kv = await getKv();
  if (!kv) return [];
  const raw = await kv.get(BLOCKED_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
