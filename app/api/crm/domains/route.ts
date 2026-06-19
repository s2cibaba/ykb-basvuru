import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { adPoolDomains, resolveActiveAdDomain } from "@/lib/domains/active-ad";
import { ensureValidActiveAd, getOperationalActiveAdHostname } from "@/lib/domains/heal-active";
import { setCachedActiveHostname } from "@/lib/domains/active-cache";
import { getDefaultOfferHost, getAdPoolHosts, isReservedFormHost } from "@/lib/offer-host";
import { getStorage } from "@/lib/storage";

// --- API helpers ---

async function spaceshipApi(path: string, opts: RequestInit = {}): Promise<unknown> {
  const key = process.env.SPACESHIP_API_KEY;
  const secret = process.env.SPACESHIP_API_SECRET;
  if (!key || !secret) throw new Error("Spaceship API not configured");

  const res = await fetch(`https://spaceship.dev/api/v1${path}`, {
    ...opts,
    headers: {
      "X-Api-Key": key,
      "X-Api-Secret": secret,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spaceship ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function cloudflareApi(path: string, opts: RequestInit = {}): Promise<{ success: boolean; result?: unknown; errors?: Array<{ message: string }> }> {
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
  const json = await res.json() as { success: boolean; result?: unknown; errors?: Array<{ message: string }> };
  if (!res.ok || !json.success) {
    throw new Error(`Cloudflare ${res.status}: ${json.errors?.[0]?.message ?? res.statusText}`);
  }
  return json;
}

async function vercelApi(path: string, opts: RequestInit = {}): Promise<unknown> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Vercel API not configured");

  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  const json = await res.json() as { error?: { message?: string } };
  if (!res.ok) throw new Error(`Vercel ${res.status}: ${json.error?.message ?? res.statusText}`);
  return json;
}

// --- Onboarding steps ---

const CF_NS = ["logan.ns.cloudflare.com", "sharon.ns.cloudflare.com"];

async function spaceshipSetNS(domain: string): Promise<string> {
  await spaceshipApi(`/domains/${domain}/nameservers`, {
    method: "PUT",
    body: JSON.stringify({ provider: "custom", hosts: CF_NS }),
  });
  return `NS → Cloudflare`;
}

async function cloudflareAddZone(domain: string): Promise<string> {
  const data = await cloudflareApi("/zones", {
    method: "POST",
    body: JSON.stringify({
      name: domain,
      account: { id: "709a10b09bfbd524cbf95e9c82842791" },
      jump_start: true,
    }),
  });
  return `CF zone: ${(data.result as { id: string }).id}`;
}

async function cloudflareGetZoneId(domain: string): Promise<string> {
  const data = await cloudflareApi(`/zones?name=${encodeURIComponent(domain)}`);
  const zone = (data.result as Array<{ id: string }>)?.[0];
  if (!zone) throw new Error(`CF zone not found for ${domain}`);
  return zone.id;
}

async function cloudflareAddDNS(domain: string): Promise<string> {
  const zoneId = await cloudflareGetZoneId(domain);
  await cloudflareApi(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: "@",
      content: "76.76.21.164",
      proxied: true,
      ttl: 1,
    }),
  });
  return `DNS A → Vercel`;
}

async function vercelAddDomain(hostname: string): Promise<string> {
  const data = await vercelApi("/v9/projects?search=ykb-basvuru") as { projects?: Array<{ id: string; name: string }> };
  const projectId = data.projects?.find((p) => p.name === "ykb-basvuru")?.id;
  if (!projectId) throw new Error("Project not found");

  await vercelApi(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  return `Vercel domain added`;
}

async function updateEntryHosts(newHost: string): Promise<string> {
  const data = await vercelApi("/v9/projects?search=ykb-basvuru") as { projects?: Array<{ id: string; name: string }> };
  const projectId = data.projects?.find((p) => p.name === "ykb-basvuru")?.id;
  if (!projectId) throw new Error("Project not found");

  const currentHosts = getAdPoolHosts();
  const updated = [...new Set([...currentHosts, newHost])].join(",");

  const envData = await vercelApi(`/v9/projects/${projectId}/env`) as { envs?: Array<{ id: string; key: string }> };
  const env = envData.envs?.find((e) => e.key === "ENTRY_HOSTS");

  if (env) {
    await vercelApi(`/v10/projects/${projectId}/env/${env.id}`, {
      method: "PATCH",
      body: JSON.stringify({ value: updated, type: "encrypted", target: ["production", "preview", "development"] }),
    });
  } else {
    await vercelApi(`/v10/projects/${projectId}/env`, {
      method: "POST",
      body: JSON.stringify({ key: "ENTRY_HOSTS", value: updated, type: "encrypted", target: ["production", "preview", "development"] }),
    });
  }
  return `ENTRY_HOSTS updated: ${updated}`;
}

// --- Route handlers ---

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const domains = await storage.listSiteDomains();
    const formDomain = getDefaultOfferHost();

    // Basit: ensureValidActiveAd yerine direkt domain listesi
    let activeDomain: string | null = null;
    try {
      const dbActive = await storage.getActiveSiteDomain();
      if (dbActive) activeDomain = dbActive.hostname;
    } catch {
      // fallback
    }
    const operational = activeDomain ?? (await getOperationalActiveAdHostname());

    return NextResponse.json({
      domains,
      activeDomain: operational,
      formDomain,
      adDomains: adPoolDomains(domains),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Domain listesi alınamadı";
    console.error("[crm domains GET]", message);
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

    const steps: string[] = [];

    // 1. Spaceship: NS → Cloudflare
    try { steps.push(await spaceshipSetNS(hostname)); }
    catch (e) { steps.push(`⚠️ Spaceship NS: ${e instanceof Error ? e.message : "hata"}`); }

    // 2. Cloudflare: add zone
    try { steps.push(await cloudflareAddZone(hostname)); }
    catch (e) { steps.push(`⚠️ CF zone: ${e instanceof Error ? e.message : "hata"}`); }

    // 3. Cloudflare: DNS CNAME → Vercel
    try { steps.push(await cloudflareAddDNS(hostname)); }
    catch (e) { steps.push(`⚠️ CF DNS: ${e instanceof Error ? e.message : "hata"}`); }

    // 4. Vercel: add domain to project
    try { steps.push(await vercelAddDomain(hostname)); }
    catch (e) { steps.push(`⚠️ Vercel domain: ${e instanceof Error ? e.message : "hata"}`); }

    // 5. Update ENTRY_HOSTS
    try { steps.push(await updateEntryHosts(hostname)); }
    catch (e) { steps.push(`⚠️ ENTRY_HOSTS: ${e instanceof Error ? e.message : "hata"}`); }

    // 6. Supabase: add to site_domains
    try {
      const storage = await getStorage();
      const domain = await storage.addSiteDomain(hostname, "standby");
      steps.push(`✅ Supabase: ${domain.hostname} (${domain.id})`);
    } catch (e) {
      steps.push(`⚠️ Supabase: ${e instanceof Error ? e.message : "hata"}`);
    }

    return NextResponse.json({ hostname, steps });
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
        { error: "yapikredi.online form domainidir; aktif reklam domaini olarak seçilemez." },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const domain = await storage.setActiveSiteDomain(hostname);
    await setCachedActiveHostname(domain.hostname);
    return NextResponse.json(domain);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Aktif domain değiştirilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}