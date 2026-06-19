import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { adPoolDomains, resolveActiveAdDomain } from "@/lib/domains/active-ad";
import { ensureValidActiveAd, getOperationalActiveAdHostname } from "@/lib/domains/heal-active";
import { setCachedActiveHostname } from "@/lib/domains/active-cache";
import { getDefaultOfferHost, getAdPoolHosts, isReservedFormHost } from "@/lib/offer-host";
import { getStorage } from "@/lib/storage";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";

async function vercelApi(path: string, opts: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${(json as { error?: { message?: string } }).error?.message ?? res.statusText}`);
  return json;
}

async function getProjectId(): Promise<string> {
  const data = await vercelApi("/v9/projects?search=ykb-basvuru") as { projects?: Array<{ id: string; name: string }> };
  const project = data.projects?.find((p) => p.name === "ykb-basvuru");
  if (!project) throw new Error('Project "ykb-basvuru" not found');
  return project.id;
}

async function addVercelDomain(hostname: string): Promise<void> {
  const projectId = await getProjectId();
  await vercelApi(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
}

async function updateEntryHosts(newHost: string): Promise<void> {
  const projectId = await getProjectId();
  const currentHosts = getAdPoolHosts();
  const updated = [...new Set([...currentHosts, newHost])].join(",");

  // Find existing env id
  const data = await vercelApi(`/v9/projects/${projectId}/env`) as { envs?: Array<{ id: string; key: string }> };
  const env = data.envs?.find((e) => e.key === "ENTRY_HOSTS");

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
}

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

    // Otomasyon: Vercel'e domain ekle + ENTRY_HOSTS güncelle
    const automation: string[] = [];
    if (VERCEL_TOKEN) {
      try {
        await addVercelDomain(hostname);
        automation.push("✅ Vercel domain eklendi");
      } catch (e) {
        automation.push(`⚠️ Vercel domain: ${e instanceof Error ? e.message : "hata"}`);
      }
      try {
        await updateEntryHosts(hostname);
        automation.push("✅ ENTRY_HOSTS güncellendi");
      } catch (e) {
        automation.push(`⚠️ ENTRY_HOSTS: ${e instanceof Error ? e.message : "hata"}`);
      }
    }

    return NextResponse.json({ domain, automation });
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