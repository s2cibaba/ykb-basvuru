import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrations = ["001_initial.sql", "002_failover.sql"];
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = "fbwjqqstvnviifpeywzt";

if (!password) {
  console.error("SUPABASE_DB_PASSWORD gerekli");
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of migrations) {
    const sqlPath = path.join(__dirname, "..", "supabase", "migrations", file);
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log(`Running ${file}...`);
    await client.query(sql);
  }
  console.log("Migrations OK");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
