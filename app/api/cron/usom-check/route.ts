import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { runUsomCheck } from "@/lib/usom/run-check";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const result = await runUsomCheck(storage, "cron");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "USOM cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
