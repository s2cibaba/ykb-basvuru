const CF_API = "https://api.cloudflare.com/client/v4";

function cfHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN gerekli");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function accountId(): string {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID gerekli");
  return id;
}

export async function getZoneByName(name: string) {
  const res = await fetch(
    `${CF_API}/zones?name=${encodeURIComponent(name)}`,
    { headers: cfHeaders(), cache: "no-store" }
  );
  const json = (await res.json()) as {
    success: boolean;
    result: Array<{ id: string; name: string; name_servers: string[]; status: string }>;
    errors?: Array<{ message: string }>;
  };
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message ?? "Zone lookup failed");
  }
  return json.result[0] ?? null;
}

export async function createZone(name: string) {
  const res = await fetch(`${CF_API}/zones`, {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({
      name,
      account: { id: accountId() },
      jump_start: false,
    }),
  });
  const json = (await res.json()) as {
    success: boolean;
    result?: { id: string; name_servers: string[] };
    errors?: Array<{ message: string }>;
  };
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message ?? "Zone create failed");
  }
  return json.result!;
}

export async function attachWorkerCustomDomain(
  hostname: string,
  service = "ykb-basvuru"
) {
  const res = await fetch(
    `${CF_API}/accounts/${accountId()}/workers/domains`,
    {
      method: "PUT",
      headers: cfHeaders(),
      body: JSON.stringify({
        hostname,
        service,
        environment: "production",
      }),
    }
  );
  const json = (await res.json()) as {
    success: boolean;
    errors?: Array<{ message: string; code: number }>;
  };
  if (!json.success) {
    const msg = json.errors?.[0]?.message ?? "Worker domain attach failed";
    if (msg.includes("already exists") || json.errors?.[0]?.code === 1004) return;
    throw new Error(msg);
  }
}

export function workerHostnamesForZone(zoneRoot: string): string[] {
  return [zoneRoot, `www.${zoneRoot}`];
}

export async function attachSubdomainHost(zoneRoot: string, subdomain: string) {
  const hostname = `${subdomain}.${zoneRoot}`;
  await attachWorkerCustomDomain(hostname);
  return hostname;
}

export async function ensureZoneOnWorker(zoneRoot: string): Promise<string[]> {
  let zone = await getZoneByName(zoneRoot);
  if (!zone) {
    const created = await createZone(zoneRoot);
    return created.name_servers;
  }
  return zone.name_servers;
}
