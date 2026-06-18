import { isFailoverExcluded } from "@/lib/domains/failover";
import { getAdPoolHosts, getDefaultOfferHost, isReservedFormHost } from "@/lib/offer-host";
import type { SiteDomain } from "@/lib/domains/types";

function isEligibleAdDomain(hostname: string, status?: SiteDomain["status"]): boolean {
  const h = hostname.toLowerCase();
  if (isReservedFormHost(h)) return false;
  if (isFailoverExcluded(h)) return false;
  if (!getAdPoolHosts().includes(h)) return false;
  if (status === "blocked") return false;
  return true;
}

/** CRM ve failover için: yalnızca geçerli reklam pool'undan aktif domain */
export function resolveActiveAdDomain(
  domains: SiteDomain[],
  dbActive: SiteDomain | null
): SiteDomain | null {
  if (
    dbActive &&
    isEligibleAdDomain(dbActive.hostname, dbActive.status) &&
    dbActive.status === "active"
  ) {
    return dbActive;
  }

  return (
    domains.find(
      (d) => d.status === "active" && isEligibleAdDomain(d.hostname, d.status)
    ) ?? null
  );
}

export function adPoolDomains(domains: SiteDomain[]): SiteDomain[] {
  const form = getDefaultOfferHost();
  return domains.filter((d) => d.hostname !== form);
}

export function domainRole(
  d: SiteDomain,
  activeAdHostname: string | null,
  formHost: string
): string {
  if (d.hostname === formHost) return "Form";
  if (d.hostname === activeAdHostname) return "Reklam (aktif)";
  if (d.status === "blocked") return "USOM engelli";
  return "Reklam (yedek)";
}
