import type { SiteDomain } from "@/lib/domains/types";
import {
  isSubdomainHostname,
  zoneRootFromHostname,
} from "@/lib/domains/types";

const BACKUP_APEX_ORDER = ["kredifirsatlari.org", "ekonomikbakis.org", "kredibasvuru.org"];

/** Manuel devre dışı bırakılmış domainler — failover adayı değil */
const FAILOVER_EXCLUDED = new Set<string>();

export function isFailoverExcluded(hostname: string): boolean {
  return FAILOVER_EXCLUDED.has(hostname.toLowerCase().replace(/^www\./, ""));
}

function subdomainPrefix(): string {
  return process.env.FAILOVER_SUBDOMAIN_PREFIX?.trim() || "v";
}

function nextSubdomainHostname(zoneRoot: string, existing: SiteDomain[]): string | null {
  const prefix = subdomainPrefix();
  const used = new Set(
    existing
      .filter((d) => d.zoneRoot === zoneRoot && d.hostType === "subdomain")
      .map((d) => d.hostname)
  );

  for (let i = 1; i <= 99; i++) {
    const host = `${prefix}${i}.${zoneRoot}`;
    if (!used.has(host)) return host;
  }
  return null;
}

/** Yedek reklam domainleri arasından sıradaki — form host (yapikredi.online) hariç */
export function pickNextAdHostname(
  active: SiteDomain,
  allDomains: SiteDomain[],
  formHost: string
): string | null {
  const form = formHost.toLowerCase();

  const sameZoneStandbySub = allDomains.find(
    (d) =>
      d.hostname !== form &&
      d.zoneRoot === (active.zoneRoot ?? zoneRootFromHostname(active.hostname)) &&
      d.hostType === "subdomain" &&
      d.status === "standby"
  );
  if (sameZoneStandbySub) return sameZoneStandbySub.hostname;

  const zoneRoot = active.zoneRoot ?? zoneRootFromHostname(active.hostname);
  const newSub = nextSubdomainHostname(zoneRoot, allDomains);
  if (
    newSub &&
    active.hostType === "apex" &&
    active.hostname === zoneRoot &&
    active.hostname !== form
  ) {
    return newSub;
  }

  const blockedOrActiveRoots = new Set(
    allDomains
      .filter((d) => d.hostType === "apex" && d.status !== "standby")
      .map((d) => d.hostname)
  );

  for (const apex of BACKUP_APEX_ORDER) {
    if (apex === form || apex === active.hostname) continue;
    const standby = allDomains.find(
      (d) => d.hostname === apex && d.status === "standby"
    );
    if (standby) return apex;
    if (!blockedOrActiveRoots.has(apex)) {
      const known = allDomains.find((d) => d.hostname === apex);
      if (!known || known.status === "standby") return apex;
    }
  }

  for (const d of allDomains) {
    if (FAILOVER_EXCLUDED.has(d.hostname) || d.hostname === form) continue;
    if (
      d.status === "standby" &&
      d.hostType === "apex" &&
      d.hostname !== active.hostname
    ) {
      return d.hostname;
    }
  }

  return null;
}

export function pickNextFormSubdomain(
  formHost: string,
  allDomains: SiteDomain[]
): string | null {
  const zoneRoot = zoneRootFromHostname(formHost);
  const existing = allDomains.find(
    (d) =>
      d.zoneRoot === zoneRoot &&
      d.hostType === "subdomain" &&
      d.status === "standby"
  );
  if (existing) return existing.hostname;
  return nextSubdomainHostname(zoneRoot, allDomains);
}

export function pickNextHostname(
  active: SiteDomain,
  allDomains: SiteDomain[],
  formHost = "yapikredi.online"
): string | null {
  return pickNextAdHostname(active, allDomains, formHost);
}

export function buildSubdomainRecord(hostname: string): {
  hostname: string;
  zoneRoot: string;
  hostType: "subdomain";
} {
  return {
    hostname: hostname.toLowerCase(),
    zoneRoot: zoneRootFromHostname(hostname),
    hostType: "subdomain",
  };
}

export function normalizeHostType(hostname: string): "apex" | "subdomain" {
  return isSubdomainHostname(hostname) ? "subdomain" : "apex";
}
