import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { sendTelegramAlert } from "@/lib/alerts/telegram";
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ok = await sendTelegramAlert(
      "<b>USOM test</b>\nTelegram bildirimleri çalışıyor."
    );

    if (!ok) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const events = await storage.listFailoverEvents(30);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failover list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
