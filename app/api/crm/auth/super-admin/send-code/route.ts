import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { sendTelegramAlert } from "@/lib/alerts/telegram";

export async function POST(request: NextRequest) {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    const storage = await getStorage();
    await storage.setSiteSetting("super_admin_code", code);
    await storage.setSiteSetting("super_admin_code_expires", expires.toString());

    const message = `<b>🔐 Super Admin Girişi</b>\n\nDoğrulama kodunuz: <code>${code}</code>\n\n<i>Kod 5 dakika geçerlidir.</i>`;
    const sent = await sendTelegramAlert(message);

    if (!sent) {
      return NextResponse.json({ error: "Telegram mesajı gönderilemedi. Bot ayarlarını kontrol edin." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Kod Telegram'a gönderildi." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kod gönderilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
