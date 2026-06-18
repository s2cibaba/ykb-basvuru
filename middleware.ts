import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminHost, isCrmPath } from "@/lib/admin-host";
import {
  checkCloak,
  OFFER_COOKIE,
  offerPassCookieOptions,
  whiteRedirectTarget,
} from "@/lib/cloaker";
import {
  getCachedActiveHostname,
  getCachedBlockedHostnames,
} from "@/lib/domains/active-cache";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Meta-ExternalAgent|meta-externalagent|Instagram|LinkedInBot|Twitterbot|Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|ia_archiver|WhatsApp|TelegramBot|Pinterestbot|Snapchat|AdsBot-Google/i;

const CLOAK_HEADER = "x-cloak-page";

function bypass(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/robots.txt" ||
    pathname === "/subeler.html" ||
    pathname === "/subeler" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".ttf") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2")
  );
}

function secureCookie(request: NextRequest): boolean {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

function nextWithCloak(
  request: NextRequest,
  page: "offer" | "white",
  setOfferCookie: boolean
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CLOAK_HEADER, page);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (setOfferCookie) {
    response.cookies.set(
      OFFER_COOKIE,
      "1",
      offerPassCookieOptions(secureCookie(request))
    );
  } else {
    response.cookies.delete(OFFER_COOKIE);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (isCrmPath(pathname) && !isAdminHost(host)) {
    return new NextResponse(null, { status: 404 });
  }

  if (bypass(pathname)) {
    return NextResponse.next();
  }

  const normalizedHost = host?.split(":")[0]?.toLowerCase().replace(/^www\./, "");
  if (normalizedHost) {
    const [active, blocked] = await Promise.all([
      getCachedActiveHostname(),
      getCachedBlockedHostnames(),
    ]);
    if (
      active &&
      blocked.includes(normalizedHost) &&
      normalizedHost !== active
    ) {
      const url = request.nextUrl.clone();
      url.hostname = active;
      url.protocol = "https:";
      return NextResponse.redirect(url, 302);
    }
  }

  if (CRAWLER_UA.test(ua)) {
    return NextResponse.redirect(
      new URL("/subeler.html", request.url),
      302
    );
  }

  if (request.cookies.get(OFFER_COOKIE)?.value === "1") {
    return nextWithCloak(request, "offer", false);
  }

  const cloak = await checkCloak(request);
  if (cloak?.page === "white") {
    return NextResponse.redirect(
      whiteRedirectTarget(request, cloak.redirectUrl),
      302
    );
  }

  return nextWithCloak(request, "offer", true);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
