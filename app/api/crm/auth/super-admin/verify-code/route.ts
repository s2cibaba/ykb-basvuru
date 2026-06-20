import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getSuperToken } from "@/lib/crm-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();

    if (!code) {
      return NextResponse.json({ error: "Kod gerekli" }, { status: 400 });
    }

    const storage = await getStorage();
    const storedCode = await storage.getSiteSetting("super_admin_code");
    const expiresStr = await storage.getSiteSetting("super_admin_code_expires");

    if (!storedCode || !expiresStr) {
      return NextResponse.json({ error: "Geçerli bir kod bulunamadı veya süresi dolmuş. Lütfen yeni kod isteyin." }, { status: 400 });
    }

    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) {
      return NextResponse.json({ error: "Kodun süresi dolmuş. Lütfen yeni kod isteyin." }, { status: 400 });
    }

    if (code !== storedCode) {
      return NextResponse.json({ error: "Hatalı kod." }, { status: 400 });
    }

    // Kod doğru, kodu temizle ve token dön
    await storage.setSiteSetting("super_admin_code", "");
    await storage.setSiteSetting("super_admin_code_expires", "0");

    const token = getSuperToken();
    return NextResponse.json({ success: true, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Doğrulama başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
