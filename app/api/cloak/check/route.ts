import { NextRequest, NextResponse } from "next/server";
import { isAdminHost } from "@/lib/admin-host";
import {
  checkCloak,
  OFFER_COOKIE,
  offerPassCookieOptions,
} from "@/lib/cloaker";

export async function GET(request: NextRequest) {
  const result = await checkCloak(request);
  const page = result?.page ?? "offer";
  const host = request.headers.get("host");

  const payload = {
    ...(result ?? { page: "offer" as const }),
    ...(isAdminHost(host) && result?.filterType
      ? { filter_type: result.filterType }
      : {}),
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
