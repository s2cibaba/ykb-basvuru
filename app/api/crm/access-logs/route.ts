import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isCrmAuthorized } from "@/lib/crm-auth";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

    const storage = await getStorage();
    const logs = await storage.listAccessLogs(limit);
    return NextResponse.json(logs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Veri okunamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    await storage.clearAccessLogs();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Temizlenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}