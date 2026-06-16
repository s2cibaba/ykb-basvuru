import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Meta-ExternalAgent|meta-externalagent|Instagram|LinkedInBot|Twitterbot|Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|ia_archiver|WhatsApp|TelegramBot|Pinterestbot|Snapchat|AdsBot-Google/i;

function bypass(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/crm") ||
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

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const { pathname } = request.nextUrl;

  if (bypass(pathname)) {
    return NextResponse.next();
  }

  if (CRAWLER_UA.test(ua)) {
    return NextResponse.redirect(new URL("/subeler", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
