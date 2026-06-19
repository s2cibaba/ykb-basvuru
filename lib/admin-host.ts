const DEFAULT_ADMIN_HOST = "ykb-basvuru.workers.dev";

export function getAdminHost(): string {
  return process.env.ADMIN_HOST ?? DEFAULT_ADMIN_HOST;
}

export function normalizeHost(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0].toLowerCase();
}

export function isCrmPath(pathname: string): boolean {
  return pathname.startsWith("/crm") || pathname.startsWith("/api/crm");
}

/** CRM yalnızca workers.dev (veya local dev) üzerinden erişilebilir. */
export function isAdminHost(host: string | null): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (normalized === "localhost" || normalized === "127.0.0.1") return true;

  const admin = normalizeHost(getAdminHost());
  if (normalized === admin) return true;
  if (normalized.endsWith(".workers.dev")) return true;
  if (normalized.endsWith(".vercel.app")) return true;

  return false;
}
