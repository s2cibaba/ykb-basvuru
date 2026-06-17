#!/usr/bin/env node
const key = process.env.SPACESHIP_API_KEY;
const secret = process.env.SPACESHIP_API_SECRET;
if (!key || !secret) {
  console.error("SPACESHIP_API_KEY ve SPACESHIP_API_SECRET gerekli");
  process.exit(1);
}

const res = await fetch(
  "https://spaceship.dev/api/v1/domains?take=100&skip=0&orderBy=name",
  {
    headers: { "X-Api-Key": key, "X-Api-Secret": secret },
  }
);
const data = await res.json();
if (!res.ok) {
  console.error(data);
  process.exit(1);
}
for (const d of data.items ?? []) {
  const ns = d.nameservers?.hosts?.join(", ") ?? d.nameservers?.provider;
  console.log(`${d.unicodeName}\t${d.expirationDate?.slice(0, 10)}\t${ns}`);
}
