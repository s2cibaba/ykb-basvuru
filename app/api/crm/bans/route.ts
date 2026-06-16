import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isCrmAuthorized } from "@/lib/crm-auth";
import type { BanType } from "@/lib/storage/types";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const bans = await storage.listBans();
    return NextResponse.json(bans);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Veri okunamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type as BanType;
    const value = String(body.value ?? "").trim();
    const reason = body.reason ? String(body.reason) : undefined;
    const expiresAt =
      body.expiresAt === null || body.expiresAt === undefined
        ? null
        : String(body.expiresAt);

    if (!value || !["ip", "session", "tc"].includes(type)) {
      return NextResponse.json({ error: "Geçersiz ban bilgisi" }, { status: 400 });
    }

    const storage = await getStorage();
    const ban = await storage.addBan(type, value, reason, expiresAt);
    return NextResponse.json(ban);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ban eklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    }

    const storage = await getStorage();
    const removed = await storage.removeBan(id);
    if (!removed) {
      return NextResponse.json({ error: "Ban bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ removed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ban kaldırılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
