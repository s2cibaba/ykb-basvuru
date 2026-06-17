import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { getStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const value = await storage.getSiteSetting("auto_failover");
    return NextResponse.json({ autoFailover: value !== "false" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const enabled = Boolean(body.autoFailover);
    const storage = await getStorage();
    await storage.setSiteSetting("auto_failover", enabled ? "true" : "false");
    return NextResponse.json({ autoFailover: enabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
