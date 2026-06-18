import { NextRequest, NextResponse } from "next/server";
import {
  checkCloak,
  OFFER_COOKIE,
  offerPassCookieOptions,
} from "@/lib/cloaker";

export async function GET(request: NextRequest) {
  const result = await checkCloak(request);
  const page = result?.page ?? "offer";

  const response = NextResponse.json(
    result ?? { page: "offer" as const }
  );

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
