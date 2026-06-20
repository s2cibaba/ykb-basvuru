import { formatFailoverAlert, sendTelegramAlert } from "@/lib/alerts/telegram";
import { resolveActiveAdDomain } from "@/lib/domains/active-ad";
import {
  setCachedActiveHostname,
  setCachedBlockedHostnames,
  setCachedOfferHostname,
} from "@/lib/domains/active-cache";
import {
  pickNextAdHostname,
  pickNextFormSubdomain,
  buildSubdomainRecord,
  isFailoverExcluded,
} from "@/lib/domains/failover";
import { ensureValidActiveAd } from "@/lib/domains/heal-active";
import type { SiteDomain } from "@/lib/domains/types";
import { zoneRootFromHostname } from "@/lib/domains/types";
import { getAdPoolHosts, getDefaultOfferHost } from "@/lib/offer-host";
import type { StorageAdapter } from "@/lib/storage/types";
import { checkHostnamesAgainstUsom } from "@/lib/usom/checker";

export interface UsomDomainCheck {
  hostname: string;
  onUsomList: boolean;
  lastUsomCheck: string | null;
  status: SiteDomain["status"];
}

export interface UsomRunResult {
  checkedAt: string;
  listSize: number;
  activeDomain: string | null;
  activeBlocked: boolean;
  blockedHostnames: string[];
  domains: SiteDomain[];
  domainChecks: UsomDomainCheck[];
  failover?: {
    from: string;
    to: string | null;
    kind?: "ad" | "form";
  };
  message: string;
}

function isAutoFailoverEnabled(): boolean {
  const env = process.env.AUTO_FAILOVER?.trim().toLowerCase();
  if (env === "false" || env === "0") return false;
  return true;
}

function isValidAdActive(domain: SiteDomain | null, formHost: string): domain is SiteDomain {
  if (!domain) return false;
  const h = domain.hostname.toLowerCase();
  if (h === formHost.toLowerCase()) return false;
  if (isFailoverExcluded(h)) return false;
  if (!getAdPoolHosts().includes(h)) return false;
  return domain.status === "active";
}

async function ensureValidActiveAdForCheck(
  storage: StorageAdapter
): Promise<SiteDomain | null> {
  const { active } = await ensureValidActiveAd(storage);
  return active;
}

function buildDomainChecks(
  domains: SiteDomain[],
  blockedHostnames: string[],
  checkedAt: string
): UsomDomainCheck[] {
  return domains.map((d) => ({
    hostname: d.hostname,
    onUsomList: blockedHostnames.includes(d.hostname),
    lastUsomCheck: d.lastUsomCheck ?? checkedAt,
    status: d.status,
  }));
}

function buildResultMessage(
  blockedHostnames: string[],
  activeHostname: string | null,
  failover: UsomRunResult["failover"]
): string {
  const blockedCount = blockedHostnames.length;
  if (failover?.to) {
    return `USOM kontrolü tamamlandı. Failover: ${failover.from} → ${failover.to}`;
  }
  if (failover && !failover.to) {
    return `USOM kontrolü tamamlandı. ${failover.from} engelli — yedek domain bulunamadı.`;
  }
  if (blockedCount === 0) {
    return `USOM kontrolü tamamlandı. Tüm domainler temiz.${activeHostname ? ` Aktif reklam: ${activeHostname}` : ""}`;
  }
  return `USOM kontrolü tamamlandı. ${blockedCount} domain USOM listesinde: ${blockedHostnames.join(", ")}`;
}

export async function runUsomCheck(
  storage: StorageAdapter,
  trigger: "cron" | "manual" = "manual"
): Promise<UsomRunResult> {
  const settingsEnabled = await storage.getSiteSetting("auto_failover");
  const autoFailover =
    settingsEnabled !== "false" && isAutoFailoverEnabled();

  const formHost = getDefaultOfferHost();
  let active = await ensureValidActiveAdForCheck(storage);
  let domains = await storage.listSiteDomains();

  const hostnames = domains.map((d) => d.hostname);

  const usom = await checkHostnamesAgainstUsom(hostnames);
  const checkedAt = usom.checkedAt;

  for (const hostname of hostnames) {
    const blocked = usom.blockedHostnames.includes(hostname);
    await storage.updateSiteDomainUsomCheck(hostname, blocked, checkedAt);
  }

  await setCachedBlockedHostnames(usom.blockedHostnames);

  let failover: UsomRunResult["failover"];
  const refreshed = await storage.listSiteDomains();

  const formBlocked = usom.blockedHostnames.includes(formHost);
  if (autoFailover && formBlocked) {
    const nextForm = pickNextFormSubdomain(formHost, refreshed);
    if (nextForm) {
      const sub = buildSubdomainRecord(nextForm);
      const exists = refreshed.find((d) => d.hostname === sub.hostname);
      if (!exists) {
        await storage.addSiteDomain(sub.hostname, "standby", {
          zoneRoot: sub.zoneRoot,
          hostType: sub.hostType,
        });
      }
      await setCachedOfferHostname(nextForm);
      await storage.logFailoverEvent({
        fromHostname: formHost,
        toHostname: nextForm,
        trigger,
        usomCheckedAt: checkedAt,
      });
      failover = { from: formHost, to: nextForm, kind: "form" };
      await sendTelegramAlert(
        `USOM form failover: ${formHost} → ${nextForm}\nReklam URL değişmez; form host KV güncellendi.`
      );
    }
  }

  const activeAd = isValidAdActive(active, formHost) ? active : null;
  const activeAdBlocked = activeAd
    ? usom.blockedHostnames.includes(activeAd.hostname)
    : false;

  if (autoFailover && activeAd && activeAdBlocked) {
    const current =
      refreshed.find((d) => d.hostname === activeAd.hostname) ?? activeAd;
    const nextHost = pickNextAdHostname(current, refreshed, formHost);

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
        fromHostname: activeAd.hostname,
        toHostname: nextHost,
        trigger,
        usomCheckedAt: checkedAt,
      });
      failover = { from: activeAd.hostname, to: nextHost, kind: "ad" };
      await sendTelegramAlert(
        formatFailoverAlert({
          from: activeAd.hostname,
          to: nextHost,
          listSize: usom.listSize,
        })
      );
    } else {
      await storage.logFailoverEvent({
        fromHostname: activeAd.hostname,
        toHostname: null,
        trigger,
        usomCheckedAt: checkedAt,
      });
      await sendTelegramAlert(
        formatFailoverAlert({
          from: activeAd.hostname,
          to: null,
          listSize: usom.listSize,
        })
      );
      failover = { from: activeAd.hostname, to: null, kind: "ad" };
    }
  }

  const updatedDomains = await storage.listSiteDomains();
  const updatedDbActive = await storage.getActiveSiteDomain();
  const resolvedActive = resolveActiveAdDomain(updatedDomains, updatedDbActive);

  if (!resolvedActive) {
    await ensureValidActiveAdForCheck(storage);
  } else if (resolvedActive.status === "active") {
    await setCachedActiveHostname(resolvedActive.hostname);
  }

  const finalDomains = await storage.listSiteDomains();
  const finalDbActive = await storage.getActiveSiteDomain();
  const finalActive = resolveActiveAdDomain(finalDomains, finalDbActive);
  if (finalActive) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`https://${finalActive.hostname}/`, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.status >= 500 || res.status === 404) {
        await sendTelegramAlert(`🚨 UYARI: Aktif reklam domaini (${finalActive.hostname}) ${res.status} hatası veriyor!\nLütfen Vercel ayarlarını veya DNS yönlendirmesini kontrol edin.`);
      }
    } catch (err) {
      await sendTelegramAlert(`🚨 UYARI: Aktif reklam domaini (${finalActive.hostname}) erişilemez durumda!\nSunucuya veya DNS'e ulaşılamıyor olabilir. Yönlendirmeyi kontrol edin.`);
    }
  }

  return {
    checkedAt,
    listSize: usom.listSize,
    activeDomain: finalActive?.hostname ?? null,
    activeBlocked: finalActive
      ? usom.blockedHostnames.includes(finalActive.hostname)
      : false,
    blockedHostnames: usom.blockedHostnames,
    domains: finalDomains,
    domainChecks: buildDomainChecks(finalDomains, usom.blockedHostnames, checkedAt),
    failover,
    message: buildResultMessage(
      usom.blockedHostnames,
      finalActive?.hostname ?? null,
      failover
    ),
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
