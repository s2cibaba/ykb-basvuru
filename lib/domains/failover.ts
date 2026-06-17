import type { SiteDomain } from "@/lib/domains/types";
import {
  isSubdomainHostname,
  zoneRootFromHostname,
} from "@/lib/domains/types";

const BACKUP_APEX_ORDER = [
  "kredibasvuru.org",
  "kredifirsatlari.org",
  "ekonomikbakis.org",
];

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

export function pickNextHostname(
  active: SiteDomain,
  allDomains: SiteDomain[]
): string | null {
  const zoneRoot = active.zoneRoot ?? zoneRootFromHostname(active.hostname);

  const sameZoneStandbySub = allDomains.find(
    (d) =>
      d.zoneRoot === zoneRoot &&
      d.hostType === "subdomain" &&
      d.status === "standby"
  );
  if (sameZoneStandbySub) return sameZoneStandbySub.hostname;

  const newSub = nextSubdomainHostname(zoneRoot, allDomains);
  if (newSub && active.hostType === "apex" && active.hostname === zoneRoot) {
    return newSub;
  }

  const blockedOrActiveRoots = new Set(
    allDomains
      .filter((d) => d.hostType === "apex" && d.status !== "standby")
      .map((d) => d.hostname)
  );

  for (const apex of BACKUP_APEX_ORDER) {
    if (apex === active.hostname) continue;
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
