const TTL_MS = 10 * 60 * 1000;

function passSecret(): string {
  return (
    process.env.OFFER_PASS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.CRM_PASSWORD?.trim() ||
    "offer-pass-dev"
  );
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const OFFER_PASS_PARAM = "op";

export async function createOfferPassToken(): Promise<string> {
  const ts = String(Date.now());
  const sig = await hmacSign(ts);
  return `${ts}.${sig}`;
}

export async function verifyOfferPassToken(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return false;
  const expected = await hmacSign(ts);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}
