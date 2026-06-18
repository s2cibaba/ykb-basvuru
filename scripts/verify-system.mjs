#!/usr/bin/env node
/**
 * Plan doğrulama: KV cache, USOM cron, Supabase site_domains tutarlılığı.
 * Kullanım: CRON_SECRET=... node scripts/verify-system.mjs
 */
const WORKER = process.env.WORKER_URL ?? "https://ykb-basvuru.s2cibaba.workers.dev";
const CRON_SECRET = process.env.CRON_SECRET?.trim();
const KV_NS = process.env.KV_NAMESPACE_ID ?? "f3cbd3262d6c4a17a41ba331a97abf48";
const EXPECTED_AD = "kredifirsatlari.org";
const FORBIDDEN = ["kredibasvuru.org"];

async function main() {
  const failures = [];

  if (!CRON_SECRET) {
    failures.push("CRON_SECRET env gerekli");
  } else {
    const res = await fetch(`${WORKER}/api/cron/usom-check`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (!res.ok) {
      failures.push(`USOM cron HTTP ${res.status}`);
    } else {
      const data = await res.json();
      if (data.activeDomain !== EXPECTED_AD) {
        failures.push(`activeDomain=${data.activeDomain} (beklenen ${EXPECTED_AD})`);
      }
      for (const host of FORBIDDEN) {
        if (data.domains?.some((d) => d.hostname === host)) {
          failures.push(`Yasak domain DB'de: ${host}`);
        }
      }
      const primary = data.domains?.find((d) => d.hostname === "yapikredi.online");
      if (primary?.isPrimary) {
        failures.push("yapikredi.online hâlâ is_primary");
      }
      console.log("USOM cron:", data.message);
    }
  }

  const { execSync } = await import("node:child_process");
  try {
    const active = execSync(
      `npx wrangler kv key get --namespace-id=${KV_NS} active_hostname --remote`,
      { encoding: "utf8" }
    ).trim();
    if (active !== EXPECTED_AD) {
      failures.push(`KV active_hostname=${active}`);
    } else {
      console.log("KV active_hostname:", active);
    }
  } catch (e) {
    failures.push("KV active_hostname okunamadı");
  }

  if (failures.length) {
    console.error("\nBAŞARISIZ:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log("\nTüm kontroller geçti.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
