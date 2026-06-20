import { getAdPoolHosts } from "@/lib/offer-host";

const DEFAULT_ADMIN_HOST = "ykb-basvuru.workers.dev";

export function getAdminHost(): string {
  return process.env.ADMIN_HOST ?? DEFAULT_ADMIN_HOST;
}

export function getAdminHosts(): string[] {
  const hosts = [getAdminHost(), process.env.ADMIN_HOSTS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalizeHost)
    .filter(Boolean);

  return [...new Set(hosts)];
}

export function normalizeHost(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0].toLowerCase();
}

export function isCrmPath(pathname: string): boolean {
  return pathname.startsWith("/crm") || pathname.startsWith("/api/crm");
}

/** CRM admin host, workers.dev, vercel.app veya local dev üzerinden erişilebilir.
 * Not: Bir reklam domaini ADMIN_HOST olarak kullanılırsa yalnızca /crm ve /api/crm
 * yolları admin sayılır; domain kökü normal reklam/cloak akışında kalır.
 */
export function isAdminHost(host: string | null): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (normalized === "localhost" || normalized === "127.0.0.1") return true;

  if (getAdminHosts().includes(normalized)) return true;
  if (normalized.endsWith(".workers.dev")) return true;
  if (normalized.endsWith(".vercel.app")) return true;

  // ENTRY_HOSTS'daki domainler de CRM admin erişimine sahip olsun
  try {
    if (getAdPoolHosts().includes(normalized)) return true;
  } catch { /* env yoksa ignore */ }

  return false;
}
