import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { setCachedActiveHostname } from "@/lib/domains/active-cache";
import { getStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const domains = await storage.listSiteDomains();
    const active = await storage.getActiveSiteDomain();

    return NextResponse.json({ domains, activeDomain: active?.hostname ?? null });
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
