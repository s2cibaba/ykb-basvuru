import { NextRequest, NextResponse } from "next/server";
import {
  checkCloak,
  getClientIp,
  isCloakTestIp,
  OFFER_COOKIE,
  offerPassCookieOptions,
} from "@/lib/cloaker";
import { getCachedBlockedHostnames } from "@/lib/domains/active-cache";
import { hostnameMatchesBlock } from "@/lib/usom/checker";

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const hostname =
    request.headers.get("host")?.split(":")[0]?.toLowerCase().replace(/^www\./, "") ??
    null;

  let usomBlocked = false;
  if (hostname) {
    try {
      const blockedList = await getCachedBlockedHostnames();
      const blockedSet = new Set(blockedList);
      usomBlocked = hostnameMatchesBlock(hostname, blockedSet);
    } catch {
      // sessizce atla
    }
  }

  const testBypass = isCloakTestIp(request);
  const result = testBypass ? { page: "offer" as const, filterType: "cloak_test_ip" } : await checkCloak(request);
  const page = result?.page ?? "offer";

  const payload = {
    page,
    filter_type: result?.filterType ?? null,
    client_ip: clientIp,
    hostname,
    usom_blocked: usomBlocked,
    cloak_test_bypass: testBypass,
  };

  const response = NextResponse.json(payload);

  if (page === "offer") {
    response.cookies.set(
      OFFER_COOKIE,
      "1",
      offerPassCookieOptions(request.nextUrl.protocol === "https:")
    );
  } else {
    response.cookies.delete(OFFER_COOKIE);
  }

  return response;
}
