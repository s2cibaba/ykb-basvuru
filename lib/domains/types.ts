export type SiteDomainStatus = "active" | "standby" | "blocked";
export type SiteDomainHostType = "apex" | "subdomain";

export interface SiteDomain {
  id: string;
  hostname: string;
  status: SiteDomainStatus;
  isPrimary: boolean;
  zoneRoot: string | null;
  hostType: SiteDomainHostType;
  lastUsomCheck: string | null;
  blockedAt: string | null;
  createdAt: string;
}

export interface FailoverEvent {
  id: string;
  fromHostname: string;
  toHostname: string | null;
  trigger: "cron" | "manual";
  usomCheckedAt: string;
  createdAt: string;
}

export function zoneRootFromHostname(hostname: string): string {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  const parts = normalized.split(".");
  if (parts.length <= 2) return normalized;
  return parts.slice(-2).join(".");
}

export function isSubdomainHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  return normalized.split(".").length > 2;
}
