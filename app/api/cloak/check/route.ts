import { NextRequest, NextResponse } from "next/server";
import { checkCloak } from "@/lib/cloaker";

const OFFER_COOKIE = "offer_pass";
const OFFER_MAX_AGE = 60 * 60 * 2;

export async function GET(request: NextRequest) {
  const result = await checkCloak(request);
  const page = result?.page ?? "offer";

  const response = NextResponse.json(
    result ?? { page: "offer" as const }
  );

  if (page === "offer") {
    response.cookies.set(OFFER_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: OFFER_MAX_AGE,
      secure: request.nextUrl.protocol === "https:",
    });
  } else {
    response.cookies.delete(OFFER_COOKIE);
  }

  return response;
}
