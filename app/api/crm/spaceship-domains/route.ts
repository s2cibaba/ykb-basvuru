import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";

const SP_API = "https://spaceship.dev/api/v1";
const VERCEL_API = "https://api.vercel.com";

function spaceshipHeaders() {
  const key = process.env.SPACESHIP_API_KEY;
  const secret = process.env.SPACESHIP_API_SECRET;
  if (!key || !secret) throw new Error("Spaceship API kimlik bilgileri eksik (SPACESHIP_API_KEY, SPACESHIP_API_SECRET)");
  return {
    "X-Api-Key": key,
    "X-Api-Secret": secret,
    "Content-Type": "application/json",
  };
}

function vercelHeaders() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Vercel API kimlik bilgisi eksik (VERCEL_TOKEN)");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getVercelProjectId(): Promise<string> {
  const res = await fetch(`${VERCEL_API}/v9/projects?search=ykb-basvuru`, {
    headers: vercelHeaders(),
  });
  const json = await res.json() as { projects?: Array<{ id: string; name: string }> };
  const project = json.projects?.find((p) => p.name === "ykb-basvuru");
  if (!project) throw new Error("Vercel'de 'ykb-basvuru' projesi bulunamadı");
  return project.id;
}

async function getVercelProjectDomains(projectId: string): Promise<string[]> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${projectId}/domains?limit=100`, {
    headers: vercelHeaders(),
  });
  const json = await res.json() as { domains?: Array<{ name: string }> };
  return (json.domains ?? []).map((d) => d.name);
}

// GET: Spaceship'teki tüm domainleri + NS bilgisi + Vercel bağlantı durumu listele
export async function GET(request: NextRequest) {
  if (!isCrmAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const results: Array<{
    domain: string;
    nameservers: string[];
    nsProvider: string;
    vercelLinked: boolean;
    expiresAt: string | null;
    locked: boolean;
    error?: string;
  }> = [];

  try {
    // Spaceship domain listesi
    const spRes = await fetch(`${SP_API}/domains?limit=100&offset=0`, {
      headers: spaceshipHeaders(),
    });
    if (!spRes.ok) {
      const txt = await spRes.text();
      return NextResponse.json(
        { error: `Spaceship API hatası (${spRes.status}): ${txt.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const spJson = await spRes.json() as {
      items?: Array<{
        domain: string;
        locked?: boolean;
        expiresAt?: string;
      }>;
      totalCount?: number;
    };

    const domains = spJson.items ?? [];

    // Vercel'deki mevcut domainler
    let vercelDomains: string[] = [];
    let vercelProjectId = "";
    try {
      vercelProjectId = await getVercelProjectId();
      vercelDomains = await getVercelProjectDomains(vercelProjectId);
    } catch (e) {
      // Vercel erişimi olmasa da Spaceship listesini döndür
      console.error("[spaceship-domains] Vercel fetch error:", e);
    }

    // Her domain için NS bilgisini al
    for (const d of domains) {
      try {
        const nsRes = await fetch(`${SP_API}/domains/${d.domain}/nameservers`, {
          headers: spaceshipHeaders(),
        });
        let nameservers: string[] = [];
        let nsProvider = "Bilinmiyor";

        if (nsRes.ok) {
          const nsJson = await nsRes.json() as { hosts?: string[] };
          nameservers = nsJson.hosts ?? [];

          const joined = nameservers.join(",").toLowerCase();
          if (joined.includes("vercel")) nsProvider = "✅ Vercel";
          else if (joined.includes("cloudflare")) nsProvider = "⚠️ Cloudflare";
          else if (nameservers.length > 0) nsProvider = `🔗 ${nameservers[0]}`;
          else nsProvider = "NS kaydı yok";
        } else {
          nsProvider = `NS sorgu hatası (${nsRes.status})`;
        }

        const vercelLinked =
          vercelDomains.includes(d.domain) || vercelDomains.includes(`www.${d.domain}`);

        results.push({
          domain: d.domain,
          nameservers,
          nsProvider,
          vercelLinked,
          expiresAt: d.expiresAt ?? null,
          locked: d.locked ?? false,
        });
      } catch (e) {
        results.push({
          domain: d.domain,
          nameservers: [],
          nsProvider: "Hata",
          vercelLinked: false,
          expiresAt: null,
          locked: false,
          error: e instanceof Error ? e.message : "Bilinmeyen hata",
        });
      }
    }

    return NextResponse.json({
      total: domains.length,
      vercelProjectId,
      domains: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Domain listesi alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Domain'i Spaceship NS → Vercel yaparak projeye ekle
export async function POST(request: NextRequest) {
  if (!isCrmAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const body = await request.json();
  const hostname = String(body.hostname ?? "").trim().toLowerCase();
  if (!hostname) {
    return NextResponse.json({ error: "Hostname gerekli" }, { status: 400 });
  }

  const steps: Array<{
    step: string;
    status: "ok" | "error" | "warn";
    detail: string;
  }> = [];

  // Adım 1: Spaceship NS → Vercel
  try {
    const res = await fetch(`${SP_API}/domains/${hostname}/nameservers`, {
      method: "PUT",
      headers: spaceshipHeaders(),
      body: JSON.stringify({
        provider: "custom",
        hosts: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    steps.push({
      step: "Spaceship NS Güncelleme",
      status: "ok",
      detail: "Nameservers → ns1.vercel-dns.com, ns2.vercel-dns.com olarak ayarlandı",
    });
  } catch (e) {
    steps.push({
      step: "Spaceship NS Güncelleme",
      status: "error",
      detail: e instanceof Error ? e.message : "Bilinmeyen hata",
    });
    // NS ayarlanamadıysa devam etme
    return NextResponse.json({ hostname, steps, success: false });
  }

  // Adım 2: Vercel proje ID'si bul
  let projectId = "";
  try {
    projectId = await getVercelProjectId();
    steps.push({
      step: "Vercel Proje Tespiti",
      status: "ok",
      detail: `Proje bulundu — ID: ${projectId}`,
    });
  } catch (e) {
    steps.push({
      step: "Vercel Proje Tespiti",
      status: "error",
      detail: e instanceof Error ? e.message : "Bilinmeyen hata",
    });
    return NextResponse.json({ hostname, steps, success: false });
  }

  // Adım 3: Vercel'e domain ekle
  try {
    const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains`, {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: hostname }),
    });
    const json = await res.json() as { name?: string; error?: { message?: string; code?: string } };
    if (!res.ok) {
      const errMsg = json.error?.message ?? res.statusText;
      const errCode = json.error?.code ?? res.status;
      if (String(errMsg).includes("already")) {
        steps.push({
          step: "Vercel Domain Ekleme",
          status: "warn",
          detail: `Domain zaten projede kayıtlı (kod: ${errCode})`,
        });
      } else {
        throw new Error(`HTTP ${errCode}: ${errMsg}`);
      }
    } else {
      steps.push({
        step: "Vercel Domain Ekleme",
        status: "ok",
        detail: `Domain başarıyla eklendi: ${json.name ?? hostname}`,
      });
    }
  } catch (e) {
    steps.push({
      step: "Vercel Domain Ekleme",
      status: "error",
      detail: e instanceof Error ? e.message : "Bilinmeyen hata",
    });
    return NextResponse.json({ hostname, steps, success: false });
  }

  // Adım 4: ENTRY_HOSTS güncelle
  try {
    const { getAdPoolHosts } = await import("@/lib/offer-host");
    const currentHosts = getAdPoolHosts();
    const updated = [...new Set([...currentHosts, hostname])].join(",");

    const envRes = await fetch(`${VERCEL_API}/v9/projects/${projectId}/env`, {
      headers: vercelHeaders(),
    });
    const envJson = await envRes.json() as { envs?: Array<{ id: string; key: string }> };
    const env = envJson.envs?.find((e) => e.key === "ENTRY_HOSTS");

    if (env) {
      await fetch(`${VERCEL_API}/v10/projects/${projectId}/env/${env.id}`, {
        method: "PATCH",
        headers: vercelHeaders(),
        body: JSON.stringify({
          value: updated,
          type: "encrypted",
          target: ["production", "preview", "development"],
        }),
      });
    } else {
      await fetch(`${VERCEL_API}/v10/projects/${projectId}/env`, {
        method: "POST",
        headers: vercelHeaders(),
        body: JSON.stringify({
          key: "ENTRY_HOSTS",
          value: updated,
          type: "encrypted",
          target: ["production", "preview", "development"],
        }),
      });
    }
    steps.push({
      step: "ENTRY_HOSTS Güncelleme",
      status: "ok",
      detail: `ENTRY_HOSTS listesi güncellendi: ${updated}`,
    });
  } catch (e) {
    steps.push({
      step: "ENTRY_HOSTS Güncelleme",
      status: "warn",
      detail: `Güncelleme yapılamadı (Vercel yeniden deploy sonrası geçerli olur): ${e instanceof Error ? e.message : "hata"}`,
    });
  }

  // Adım 5: Supabase'e kaydet
  try {
    const { getStorage } = await import("@/lib/storage");
    const storage = await getStorage();
    const domain = await storage.addSiteDomain(hostname, "standby");
    steps.push({
      step: "Veritabanı (Supabase) Kaydı",
      status: "ok",
      detail: `Domain veritabanına eklendi — ID: ${domain.id}`,
    });
  } catch (e) {
    steps.push({
      step: "Veritabanı (Supabase) Kaydı",
      status: "warn",
      detail: `Supabase kaydı yapılamadı (domain zaten ekli olabilir): ${e instanceof Error ? e.message : "hata"}`,
    });
  }

  return NextResponse.json({ hostname, steps, success: true });
}
