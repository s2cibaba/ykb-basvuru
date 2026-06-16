import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { isAdminPath } from "@/lib/access-control";
import { getClientIp } from "@/lib/request-ip";
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "/";

    if (isAdminPath(path)) {
      return NextResponse.json({ logged: false, banned: false });
    }

    const ip = getClientIp(request);
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("app_session")?.value;
    const isNewSession = !sessionId;
    if (!sessionId) sessionId = uuidv4();

    const storage = await getStorage();
    const banResult = await storage.checkBan({ ip, sessionId });

    await storage.logAccess({
      ip,
      sessionId,
      path,
      userAgent: request.headers.get("user-agent") ?? undefined,
      blocked: banResult.banned,
      blockReason: banResult.reason,
    });

    const response = NextResponse.json({
      logged: true,
      banned: banResult.banned,
      reason: banResult.reason,
    });

    if (isNewSession) {
      response.cookies.set("app_session", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Log kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
