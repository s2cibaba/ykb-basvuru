// Cloudflare KV cache — Vercel'de çalışmaz, Supabase site_settings kullanılıyor.
// Bu dosyadaki tüm fonksiyonlar graceful fallback döner.

export async function getCachedActiveHostname(): Promise<string | null> {
  return null;
}

export async function setCachedActiveHostname(_hostname: string): Promise<void> {
  // Vercel'de KV yok — Supabase üzerinden site_domains zaten kullanılıyor
}

export async function setCachedBlockedHostnames(_hostnames: string[]): Promise<void> {}

export async function getCachedOfferHostname(): Promise<string | null> {
  return null;
}

export async function setCachedOfferHostname(_hostname: string): Promise<void> {}

export async function getCachedBlockedHostnames(): Promise<string[]> {
  return [];
}