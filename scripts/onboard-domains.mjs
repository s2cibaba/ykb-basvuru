#!/usr/bin/env node
/**
 * Onboard backup domains: CF zone NS → Spaceship, Worker custom domains.
 * Usage: node scripts/onboard-domains.mjs kredibasvuru.org
 */
const CF_API = "https://api.cloudflare.com/client/v4";
const SP_API = "https://spaceship.dev/api/v1";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SP_KEY = process.env.SPACESHIP_API_KEY;
const SP_SECRET = process.env.SPACESHIP_API_SECRET;
const WORKER = "ykb-basvuru";

const domains = process.argv.slice(2);
if (!domains.length || !ACCOUNT_ID || !CF_TOKEN || !SP_KEY || !SP_SECRET) {
  console.error(
    "Usage: CLOUDFLARE_* + SPACESHIP_* env ile node scripts/onboard-domains.mjs <domain>..."
  );
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

async function attachWorker(hostname) {
  const r = await fetch(
    `${CF_API}/accounts/${ACCOUNT_ID}/workers/domains`,
    {
      method: "PUT",
      headers: cfH,
      body: JSON.stringify({
        hostname,
        service: WORKER,
        environment: "production",
      }),
    }
  );
  const j = await r.json();
  if (!j.success && !String(j.errors?.[0]?.message).includes("already")) {
    throw new Error(j.errors?.[0]?.message ?? "attach failed");
  }
}

async function updateNs(domain, hosts) {
  const r = await fetch(`${SP_API}/domains/${domain}/nameservers`, {
    method: "PUT",
    headers: spH,
    body: JSON.stringify({ provider: "custom", hosts }),
  });
  if (!r.ok) throw new Error(await r.text());
}

for (const domain of domains) {
  console.log(`\n=== ${domain} ===`);
  const zone = await getZone(domain);
  if (!zone) {
    console.log("CF zone yok — Dashboard'dan site ekle.");
    continue;
  }
  console.log("NS:", zone.name_servers.join(", "));
  await updateNs(domain, zone.name_servers);
  console.log("Spaceship NS OK");
  for (const h of [domain, `www.${domain}`]) {
    try {
      await attachWorker(h);
      console.log("Worker:", h);
    } catch (e) {
      console.log("Worker skip:", h, e.message);
    }
  }
}

console.log("\nTamam. npm run deploy");
