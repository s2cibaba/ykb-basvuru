import { NextRequest, NextResponse } from "next/server";
import { checkCloak } from "@/lib/cloaker";

export async function GET(request: NextRequest) {
  const result = await checkCloak(request);

  if (!result) {
    return NextResponse.json({ page: "offer" });
  }

  return NextResponse.json(result);
}
