import { formatFailoverAlert, sendTelegramAlert } from "@/lib/alerts/telegram";
import {
  setCachedActiveHostname,
  setCachedBlockedHostnames,
} from "@/lib/domains/active-cache";
import { pickNextHostname, buildSubdomainRecord } from "@/lib/domains/failover";
import type { SiteDomain } from "@/lib/domains/types";
import { zoneRootFromHostname } from "@/lib/domains/types";
import type { StorageAdapter } from "@/lib/storage/types";
import { checkHostnamesAgainstUsom } from "@/lib/usom/checker";

export interface UsomRunResult {
  checkedAt: string;
  listSize: number;
  activeDomain: string | null;
  activeBlocked: boolean;
  blockedHostnames: string[];
  domains: SiteDomain[];
  failover?: {
    from: string;
    to: string | null;
  };
}

function isAutoFailoverEnabled(): boolean {
  const env = process.env.AUTO_FAILOVER?.trim().toLowerCase();
  if (env === "false" || env === "0") return false;
  return true;
}

export async function runUsomCheck(
  storage: StorageAdapter,
  trigger: "cron" | "manual" = "manual"
): Promise<UsomRunResult> {
  const settingsEnabled = await storage.getSiteSetting("auto_failover");
  const autoFailover =
    settingsEnabled !== "false" && isAutoFailoverEnabled();

  const domains = await storage.listSiteDomains();
  const active = await storage.getActiveSiteDomain();
  const hostnames = domains.map((d) => d.hostname);

  const usom = await checkHostnamesAgainstUsom(hostnames);
  const checkedAt = usom.checkedAt;

  for (const hostname of hostnames) {
    const blocked = usom.blockedHostnames.includes(hostname);
    await storage.updateSiteDomainUsomCheck(hostname, blocked, checkedAt);
  }

  await setCachedBlockedHostnames(usom.blockedHostnames);

  let failover: UsomRunResult["failover"];
  const activeBlocked = active
    ? usom.blockedHostnames.includes(active.hostname)
    : false;

  if (autoFailover && active && activeBlocked) {
    const refreshed = await storage.listSiteDomains();
    const current = refreshed.find((d) => d.hostname === active.hostname) ?? active;
    let nextHost = pickNextHostname(current, refreshed);

    if (nextHost && nextHost.includes(".") && nextHost.split(".").length > 2) {
      const sub = buildSubdomainRecord(nextHost);
      const exists = refreshed.find((d) => d.hostname === sub.hostname);
      if (!exists) {
        await storage.addSiteDomain(sub.hostname, "standby", {
          zoneRoot: sub.zoneRoot,
          hostType: sub.hostType,
        });
      }
    }

    if (nextHost) {
      await storage.setActiveSiteDomain(nextHost);
      await setCachedActiveHostname(nextHost);
      await storage.logFailoverEvent({
        fromHostname: active.hostname,
        toHostname: nextHost,
        trigger,
        usomCheckedAt: checkedAt,
      });
      failover = { from: active.hostname, to: nextHost };
      await sendTelegramAlert(
        formatFailoverAlert({
          from: active.hostname,
          to: nextHost,
          listSize: usom.listSize,
        })
      );
    } else {
      await storage.logFailoverEvent({
        fromHostname: active.hostname,
        toHostname: null,
        trigger,
        usomCheckedAt: checkedAt,
      });
      await sendTelegramAlert(
        formatFailoverAlert({
          from: active.hostname,
          to: null,
          listSize: usom.listSize,
        })
      );
      failover = { from: active.hostname, to: null };
    }
  }

  const updatedDomains = await storage.listSiteDomains();
  const updatedActive = await storage.getActiveSiteDomain();
  if (updatedActive) {
    await setCachedActiveHostname(updatedActive.hostname);
  }

  return {
    checkedAt,
    listSize: usom.listSize,
    activeDomain: updatedActive?.hostname ?? null,
    activeBlocked: updatedActive
      ? usom.blockedHostnames.includes(updatedActive.hostname)
      : false,
    blockedHostnames: usom.blockedHostnames,
    domains: updatedDomains,
    failover,
  };
}

export async function ensureDomainMetadata(
  storage: StorageAdapter,
  hostname: string
): Promise<void> {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");
  const zoneRoot = zoneRootFromHostname(normalized);
  const hostType = normalized.split(".").length > 2 ? "subdomain" : "apex";
  const domains = await storage.listSiteDomains();
  const existing = domains.find((d) => d.hostname === normalized);
  if (existing?.zoneRoot) return;
  await storage.addSiteDomain(normalized, existing?.status ?? "standby", {
    zoneRoot,
    hostType,
  });
}
