import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/request-ip";
import { getStorage } from "@/lib/storage";

export function isAdminPath(path: string): boolean {
  return path.startsWith("/crm") || path.startsWith("/api/crm");
}

export async function getAccessContext(request: NextRequest) {
  const ip = getClientIp(request);
  const sessionId = request.cookies.get("app_session")?.value;
  return { ip, sessionId };
}

export async function assertNotBanned(
  request: NextRequest,
  extra?: { tcKimlik?: string }
): Promise<NextResponse | null> {
  const path = new URL(request.url).pathname;
  if (isAdminPath(path)) return null;

  const { ip, sessionId } = await getAccessContext(request);
  const storage = await getStorage();
  const result = await storage.checkBan({
    ip,
    sessionId,
    tcKimlik: extra?.tcKimlik,
  });

  if (!result.banned) return null;

  await storage.logAccess({
    ip,
    sessionId,
    path,
    userAgent: request.headers.get("user-agent") ?? undefined,
    blocked: true,
    blockReason: result.reason,
  });

  return NextResponse.json(
    { error: result.reason ?? "Erişiminiz engellendi." },
    { status: 403 }
  );
}
