#!/usr/bin/env node
/**
 * Backup domainleri Cloudflare'e bağla: zone oluştur/doğrula → Spaceship NS → deploy routes.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CF_API = "https://api.cloudflare.com/client/v4";
const SP_API = "https://spaceship.dev/api/v1";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SP_KEY = process.env.SPACESHIP_API_KEY;
const SP_SECRET = process.env.SPACESHIP_API_SECRET;
const WORKER = "ykb-basvuru";
const POLL_SEC = Number(process.env.CF_POLL_SEC ?? 15);
const POLL_MAX = Number(process.env.CF_POLL_MAX ?? 40);

const DEFAULT_DOMAINS = ["kredifirsatlari.org", "ekonomikbakis.org"];

const domains = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_DOMAINS;

const root = dirname(fileURLToPath(import.meta.url));
const wranglerPath = join(root, "..", "wrangler.jsonc");

if (!ACCOUNT_ID || !CF_TOKEN || !SP_KEY || !SP_SECRET) {
  console.error("CLOUDFLARE_* ve SPACESHIP_* env gerekli");
  process.exit(1);
}

const cfH = {
  Authorization: `Bearer ${CF_TOKEN}`,
  "Content-Type": "application/json",
};
const spH = {
  "X-Api-Key": SP_KEY,
  "X-Api-Secret": SP_SECRET,
  "Content-Type": "application/json",
};

async function getZone(name) {
  const r = await fetch(`${CF_API}/zones?name=${encodeURIComponent(name)}`, {
    headers: cfH,
  });
  const j = await r.json();
  return j.result?.[0] ?? null;
}

async function createZone(name) {
  const r = await fetch(`${CF_API}/zones`, {
    method: "POST",
    headers: cfH,
    body: JSON.stringify({
      name,
      account: { id: ACCOUNT_ID },
      jump_start: true,
      type: "full",
    }),
  });
  const j = await r.json();
  if (!j.success) {
    const msg = j.errors?.[0]?.message ?? "zone create failed";
    if (msg.includes("zone.create")) return { ok: false, reason: "no-permission" };
    if (msg.includes("already exists")) return { ok: true, zone: await getZone(name) };
    return { ok: false, reason: msg };
  }
  return { ok: true, zone: j.result };
}

async function updateNs(domain, hosts) {
  const r = await fetch(`${SP_API}/domains/${domain}/nameservers`, {
    method: "PUT",
    headers: spH,
    body: JSON.stringify({ provider: "custom", hosts }),
  });
  if (!r.ok) throw new Error(`${domain} NS: ${await r.text()}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureWranglerRoutes(zoneRoots) {
  const raw = readFileSync(wranglerPath, "utf8");
  const routeSet = new Set();
  for (const d of zoneRoots) {
    routeSet.add(d);
    routeSet.add(`www.${d}`);
  }
  routeSet.add("yapikredi.online");
  routeSet.add("www.yapikredi.online");

  const routes = [...routeSet].map((pattern) => ({
    pattern,
    custom_domain: true,
  }));

  const routesBlock = routes
    .map(
      (r) =>
        `    { "pattern": "${r.pattern}", "custom_domain": true }`
    )
    .join(",\n");

  const next = raw.replace(
    /"routes":\s*\[[\s\S]*?\]/,
    `"routes": [\n${routesBlock}\n  ]`
  );
  writeFileSync(wranglerPath, next, "utf8");
  console.log("wrangler.jsonc routes güncellendi:", [...routeSet].join(", "));
}

async function deploy() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLOUDFLARE_API_TOKEN;
    delete env.CLOUDFLARE_API_KEY;
    delete env.CLOUDFLARE_EMAIL;
    const child = spawn("npm", ["run", "deploy"], {
      cwd: join(root, ".."),
      shell: true,
      env,
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`deploy exit ${code}`))
    );
  });
}

async function ensureZones() {
  const ready = new Map();
  let needDashboard = false;

  for (const domain of domains) {
    let zone = await getZone(domain);
    if (zone) {
      console.log(`✓ ${domain} zone mevcut`);
      ready.set(domain, zone);
      continue;
    }
    const created = await createZone(domain);
    if (created.ok && created.zone) {
      console.log(`✓ ${domain} zone oluşturuldu`);
      ready.set(domain, created.zone);
      continue;
    }
    if (created.reason === "no-permission") {
      needDashboard = true;
      console.log(`✗ ${domain} — API token zone oluşturamıyor`);
    } else {
      console.log(`✗ ${domain} — ${created.reason}`);
    }
  }

  if (needDashboard && ready.size < domains.length) {
    const dash = `https://dash.cloudflare.com/${ACCOUNT_ID}/domains/add`;
    console.log("\nDashboard'dan site ekle (Free plan):");
    for (const d of domains) {
      if (!ready.has(d)) console.log(`  - ${d}`);
    }
    console.log(`\n${dash}\n`);
    try {
      spawn("cmd", ["/c", "start", "", dash], { detached: true, stdio: "ignore" });
    } catch {
      /* ignore */
    }

    for (let i = 0; i < POLL_MAX && ready.size < domains.length; i++) {
      await sleep(POLL_SEC * 1000);
      for (const d of domains) {
        if (ready.has(d)) continue;
        const z = await getZone(d);
        if (z) {
          console.log(`✓ ${d} zone bulundu (poll)`);
          ready.set(d, z);
        }
      }
      if (ready.size < domains.length) {
        console.log(
          `Bekleniyor… ${ready.size}/${domains.length} (${(i + 1) * POLL_SEC}s)`
        );
      }
    }
  }

  return ready;
}

async function main() {
  console.log("=== Cloudflare backup domain onboard ===\n");
  const zones = await ensureZones();

  if (zones.size < domains.length) {
    const missing = domains.filter((d) => !zones.has(d));
    console.error("\nEksik zone:", missing.join(", "));
    console.error(
      "Yeni API token: Account → Zone → Create + Edit + Workers Routes Edit"
    );
    process.exit(1);
  }

  for (const [domain, zone] of zones) {
    console.log(`\n=== ${domain} NS ===`);
    await updateNs(domain, zone.name_servers);
    console.log("Spaceship NS:", zone.name_servers.join(", "));
  }

  ensureWranglerRoutes([...zones.keys()]);
  console.log("\nDeploy başlıyor (wrangler OAuth)…");
  await deploy();
  console.log("\nTamam — tüm backup domainler bağlandı.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
