import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { normalizeHostname, getDefaultOfferHost } from "@/lib/offer-host";
import { getStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const autoFailover = await storage.getSiteSetting("auto_failover");
    const offerHost = await storage.getSiteSetting("offer_host");
    const cloakEnabled = await storage.getSiteSetting("cloak_enabled");
    const redirectEnabled = await storage.getSiteSetting("redirect_enabled");
    return NextResponse.json({
      autoFailover: autoFailover !== "false",
      offerHost: normalizeHostname(offerHost) || getDefaultOfferHost(),
      cloakEnabled: cloakEnabled !== "false",
      redirectEnabled: redirectEnabled !== "false",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const enabled = Boolean(body.autoFailover);
    const offerHost = normalizeHostname(
      typeof body.offerHost === "string" ? body.offerHost : null
    );
    const storage = await getStorage();
    await storage.setSiteSetting("auto_failover", enabled ? "true" : "false");
    if (offerHost) {
      await storage.setSiteSetting("offer_host", offerHost);
    }
    if (typeof body.cloakEnabled === "boolean") {
      await storage.setSiteSetting("cloak_enabled", body.cloakEnabled ? "true" : "false");
    }
    if (typeof body.redirectEnabled === "boolean") {
      await storage.setSiteSetting("redirect_enabled", body.redirectEnabled ? "true" : "false");
    }

    const currentOfferHost = await storage.getSiteSetting("offer_host");
    const cloakEnabled = await storage.getSiteSetting("cloak_enabled");
    const redirectEnabled = await storage.getSiteSetting("redirect_enabled");
    return NextResponse.json({
      autoFailover: enabled,
      offerHost: normalizeHostname(currentOfferHost) || getDefaultOfferHost(),
      cloakEnabled: cloakEnabled !== "false",
      redirectEnabled: redirectEnabled !== "false",
      dnsNote: "Vercel DNS otomatik yonetiliyor",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
