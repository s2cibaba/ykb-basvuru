import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminHost, isCrmPath } from "@/lib/admin-host";
import {
  getCachedActiveHostname,
  getCachedBlockedHostnames,
} from "@/lib/domains/active-cache";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Meta-ExternalAgent|meta-externalagent|Instagram|LinkedInBot|Twitterbot|Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|ia_archiver|WhatsApp|TelegramBot|Pinterestbot|Snapchat|AdsBot-Google/i;

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
    return NextResponse.redirect(new URL("/subeler", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
