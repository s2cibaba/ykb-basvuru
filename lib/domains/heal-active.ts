import { resolveActiveAdDomain } from "@/lib/domains/active-ad";
import { getCachedActiveHostname, setCachedActiveHostname } from "@/lib/domains/active-cache";
import { isFailoverExcluded } from "@/lib/domains/failover";
import type { SiteDomain } from "@/lib/domains/types";
import { getAdPoolHosts, getDefaultOfferHost } from "@/lib/offer-host";
import type { StorageAdapter } from "@/lib/storage/types";

/** Cloaker'ın kullandığı host — ENTRY_HOSTS + KV (DB'den bağımsız) */
export async function getOperationalActiveAdHostname(): Promise<string | null> {
  const pool = getAdPoolHosts().filter((h) => !isFailoverExcluded(h));
  const cached = await getCachedActiveHostname();
  if (cached && pool.includes(cached)) return cached;
  return pool[0] ?? null;
}

export async function ensureValidActiveAd(
  storage: StorageAdapter
): Promise<{ domains: SiteDomain[]; active: SiteDomain | null }> {
  const formHost = getDefaultOfferHost();
  let domains = await storage.listSiteDomains();
  const dbActive = await storage.getActiveSiteDomain();
  const resolved = resolveActiveAdDomain(domains, dbActive);
  if (resolved) {
    return { domains, active: resolved };
  }

  const pool = getAdPoolHosts().filter((h) => !isFailoverExcluded(h));
  const cached = await getCachedActiveHostname();
  const preferOrder = [...new Set([cached, ...pool].filter(Boolean))] as string[];

  for (const hostname of preferOrder) {
    if (!pool.includes(hostname)) continue;

    let domain = domains.find((d) => d.hostname === hostname);
    if (!domain) {
      domain = await storage.addSiteDomain(hostname, "standby");
      domains = await storage.listSiteDomains();
    }
    if (domain.status === "blocked") continue;

    const activated = await storage.setActiveSiteDomain(hostname);
    await setCachedActiveHostname(hostname);
    domains = await storage.listSiteDomains();
    return {
      domains,
      active: resolveActiveAdDomain(domains, activated) ?? activated,
    };
  }

  return { domains, active: null };
}
