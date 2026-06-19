import type { NextRequest } from "next/server";
import { getCachedActiveHostname, getCachedOfferHostname } from "@/lib/domains/active-cache";
import { isFailoverExcluded } from "@/lib/domains/failover";
import { OFFER_PASS_PARAM, verifyOfferPassToken } from "@/lib/offer-pass";

const DEFAULT_OFFER_HOST = "yapikredi.online";

/** Yedek reklam domainleri — aynı anda yalnızca biri aktif (CRM + USOM failover) */
const AD_POOL_HOSTS = ["kredifirsatlari.org", "ekonomikbakis.org"];

const AD_CLICK_PARAMS = ["fbclid", "gclid", "ttclid", "twclid", "msclkid"];

export function normalizeHostname(host: string | null): string {
  if (!host) return "";
  return host.split(":")[0].toLowerCase().replace(/^www\./, "");
}

export function getDefaultOfferHost(): string {
  const fromEnv = process.env.OFFER_HOST?.trim().toLowerCase();
  return normalizeHostname(fromEnv || DEFAULT_OFFER_HOST);
}

/** Form host — env veya KV (USOM subdomain failover sonrası) */
export async function getOfferHost(): Promise<string> {
  const cached = await getCachedOfferHostname();
  if (cached) return normalizeHostname(cached);
  return getDefaultOfferHost();
}

export function getAdPoolHosts(): string[] {
  const raw = process.env.ENTRY_HOSTS?.trim();
  const list = raw
    ? raw.split(",").map((h) => normalizeHostname(h)).filter(Boolean)
    : AD_POOL_HOSTS;
  return [...new Set(list)];
}

export function isAdPoolHost(host: string | null): boolean {
  const normalized = normalizeHostname(host);
  if (!normalized) return false;
  return getAdPoolHosts().includes(normalized);
}

export async function isOfferHost(host: string | null): Promise<boolean> {
  const normalized = normalizeHostname(host);
  if (!normalized) return false;
  return normalized === (await getOfferHost());
}

/** ENTRY_HOSTS'in ilk domaini → aktif reklam domaini */
export async function getActiveAdHost(): Promise<string | null> {
  return getAdPoolHosts()[0] ?? null;
}

export async function isEntryHost(host: string | null): Promise<boolean> {
  return isAdPoolHost(host);
}

export function isFormHostHostname(host: string | null): boolean {
  const normalized = normalizeHostname(host);
  if (!normalized) return false;
  return normalized === getDefaultOfferHost();
}

/** CRM'de form domaini aktif reklam domaini yapılamaz */
export function isReservedFormHost(hostname: string): boolean {
  return normalizeHostname(hostname) === getDefaultOfferHost();
}

export function hasAdClickParam(request: NextRequest): boolean {
  return hasAdClickInUrl(request.nextUrl);
}

export function hasAdClickInUrl(url: URL): boolean {
  return AD_CLICK_PARAMS.some((key) => url.searchParams.has(key));
}

export function refererHostname(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return normalizeHostname(new URL(referer).hostname);
  } catch {
    return null;
  }
}

export async function isTrustedOfferArrival(
  request: NextRequest
): Promise<boolean> {
  const op = request.nextUrl.searchParams.get(OFFER_PASS_PARAM);
  if (await verifyOfferPassToken(op)) return true;

  if (hasAdClickParam(request)) return true;

  const ref = refererHostname(request);
  if (!ref) return false;

  if (isAdPoolHost(ref) || ref === (await getOfferHost())) return true;

  return /facebook\.com|instagram\.com|fb\.com|l\.facebook\.com/i.test(
    request.headers.get("referer") ?? ""
  );
}

export async function buildOfferHostUrl(request: NextRequest): Promise<URL> {
  const target = request.nextUrl.clone();
  target.protocol = "https:";
  target.hostname = await getOfferHost();
  if (target.pathname === "" || target.pathname === "/") {
    target.pathname = "/";
  }
  return target;
}

export async function buildActiveAdUrl(request: NextRequest): Promise<URL> {
  const active = await getActiveAdHost();
  const target = request.nextUrl.clone();
  target.protocol = "https:";
  target.hostname = active ?? request.nextUrl.hostname;
  return target;
}
