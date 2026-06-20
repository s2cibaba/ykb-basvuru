import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { normalizeHostname, getDefaultOfferHost } from "@/lib/offer-host";
import { getStorage } from "@/lib/storage";

async function cloudflareApi(
  path: string,
  opts: RequestInit = {}
): Promise<{ success: boolean; result?: unknown; errors?: Array<{ message: string }> }> {
  const email = process.env.CF_EMAIL;
  const key = process.env.CF_KEY;
  if (!email || !key) throw new Error("Cloudflare API not configured");

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: {
      "X-Auth-Email": email,
      "X-Auth-Key": key,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  const json = (await res.json()) as {
    success: boolean;
    result?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (!res.ok || !json.success) {
    throw new Error(
      `Cloudflare ${res.status}: ${json.errors?.[0]?.message ?? res.statusText}`
    );
  }
  return json;
}

async function cloudflareGetZoneId(domain: string): Promise<string> {
  const data = await cloudflareApi(`/zones?name=${encodeURIComponent(domain)}`);
  const zone = (data.result as Array<{ id: string }>)?.[0];
  if (!zone) throw new Error(`CF zone not found for ${domain}`);
  return zone.id;
}

async function cloudflareSetDNSOnly(domain: string): Promise<string> {
  const zoneId = await cloudflareGetZoneId(domain);
  const records = await cloudflareApi(
    `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(domain)}`
  );
  const record = (records.result as Array<{ id: string }>)?.[0];

  if (!record) {
    await cloudflareApi(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name: "@",
        content: "76.76.21.164",
        proxied: false,
        ttl: 1,
      }),
    });
    return "CF DNS-only created";
  }

  await cloudflareApi(`/zones/${zoneId}/dns_records/${record.id}`, {
    method: "PATCH",
    body: JSON.stringify({ proxied: false, ttl: 1, content: "76.76.21.164" }),
  });
  return "CF DNS-only updated";
}

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const autoFailover = await storage.getSiteSetting("auto_failover");
    const offerHost = await storage.getSiteSetting("offer_host");
    return NextResponse.json({
      autoFailover: autoFailover !== "false",
      offerHost: normalizeHostname(offerHost) || getDefaultOfferHost(),
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
    let offerHostDnsOnly: string | null = null;
    if (offerHost) {
      await storage.setSiteSetting("offer_host", offerHost);
      try {
        offerHostDnsOnly = await cloudflareSetDNSOnly(offerHost);
      } catch (e) {
        offerHostDnsOnly = `⚠️ CF DNS-only: ${e instanceof Error ? e.message : "hata"}`;
      }
    }
    const currentOfferHost = await storage.getSiteSetting("offer_host");
    return NextResponse.json({
      autoFailover: enabled,
      offerHost: normalizeHostname(currentOfferHost) || getDefaultOfferHost(),
      offerHostDnsOnly,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
