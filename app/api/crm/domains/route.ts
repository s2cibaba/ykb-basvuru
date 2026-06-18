import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { adPoolDomains, resolveActiveAdDomain } from "@/lib/domains/active-ad";
import { ensureValidActiveAd, getOperationalActiveAdHostname } from "@/lib/domains/heal-active";
import { setCachedActiveHostname } from "@/lib/domains/active-cache";
import { getDefaultOfferHost, isReservedFormHost } from "@/lib/offer-host";
import { getStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const { domains, active } = await ensureValidActiveAd(storage);
    const formDomain = getDefaultOfferHost();
    const operational = active?.hostname ?? (await getOperationalActiveAdHostname());

    return NextResponse.json({
      domains,
      activeDomain: operational,
      activeFromDb: active?.hostname ?? null,
      formDomain,
      adDomains: adPoolDomains(domains),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Domain listesi alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const hostname = String(body.hostname ?? "").trim();
    if (!hostname) {
      return NextResponse.json({ error: "hostname gerekli" }, { status: 400 });
    }

    const storage = await getStorage();
    const domain = await storage.addSiteDomain(hostname, "standby");
    return NextResponse.json(domain);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Domain eklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const hostname = String(body.hostname ?? "").trim();
    if (!hostname) {
      return NextResponse.json({ error: "hostname gerekli" }, { status: 400 });
    }

    if (isReservedFormHost(hostname)) {
      return NextResponse.json(
        {
          error:
            "yapikredi.online form domainidir; aktif reklam domaini olarak seçilemez.",
        },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const domain = await storage.setActiveSiteDomain(hostname);
    await setCachedActiveHostname(domain.hostname);
    return NextResponse.json(domain);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Aktif domain değiştirilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
