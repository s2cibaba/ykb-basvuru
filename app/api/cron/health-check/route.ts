import { NextRequest, NextResponse } from "next/server";
import { sendTelegramAlert } from "@/lib/alerts/telegram";
import { getAdPoolHosts, getOfferHost } from "@/lib/offer-host";
import { listSpaceshipDomains } from "@/lib/spaceship/client";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

interface DomainHealth {
  hostname: string;
  status: number | null;
  error?: string;
  reachable: boolean;
}

interface SpaceshipAlert {
  domain: string;
  expirationDate: string;
  daysLeft: number;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts: string[] = [];
    const healthResults: DomainHealth[] = [];

    // 1. Reklam domainlerini ve offer domainini kontrol et
    const adHosts = getAdPoolHosts();
    const offerHost = await getOfferHost();
    const allHosts = [...adHosts, offerHost];

    for (const hostname of allHosts) {
      const result: DomainHealth = { hostname, status: null, reachable: false };
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`https://${hostname}/`, {
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        result.status = res.status;
        result.reachable = res.ok;
        if (!res.ok) {
          alerts.push(`⚠️ ${hostname} → HTTP ${res.status}`);
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Bilinmeyen hata";
        result.status = null;
        alerts.push(`🚨 ${hostname} → ERİŞİLEMEZ: ${result.error}`);
      }
      healthResults.push(result);
    }

    // 2. Spaceship domain expire kontrolü
    const spaceAlerts: SpaceshipAlert[] = [];
    try {
      const domains = await listSpaceshipDomains();
      const now = Date.now();
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

      for (const domain of domains) {
        const expDate = new Date(domain.expirationDate).getTime();
        const daysLeft = Math.ceil((expDate - now) / (24 * 60 * 60 * 1000));

        if (daysLeft <= 30) {
          spaceAlerts.push({
            domain: domain.name,
            expirationDate: domain.expirationDate,
            daysLeft,
          });
          alerts.push(
            `⏰ ${domain.name} → ${daysLeft} gün içinde expire olacak (${domain.expirationDate})`
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spaceship API hatası";
      alerts.push(`⚠️ Spaceship API erişilemez: ${msg}`);
    }

    // 3. Telegram bildirimi
    if (alerts.length > 0) {
      const telegramMsg = [
        "<b>🩺 Domain Sağlık Kontrolü</b>",
        ...alerts.map((a) => `• ${a}`),
        "",
        `<i>${new Date().toISOString()}</i>`,
      ].join("\n");
      await sendTelegramAlert(telegramMsg);
    }

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      domains: healthResults,
      spaceshipAlerts: spaceAlerts,
      alertCount: alerts.length,
      healthy: alerts.length === 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}