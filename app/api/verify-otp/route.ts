import { NextRequest, NextResponse } from "next/server";
import { assertNotBanned } from "@/lib/access-control";
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const bannedResponse = await assertNotBanned(request);
    if (bannedResponse) return bannedResponse;

    const { attemptId, code, applicantId } = await request.json();
    if (!attemptId || !code) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }

    const storage = await getStorage();
    const valid = await storage.verifyOtp(attemptId, code);

    if (!valid) {
      return NextResponse.json(
        { error: "Doğrulama kodu hatalı veya süresi dolmuş" },
        { status: 400 }
      );
    }

    await storage.markAttemptOtpVerified(attemptId);
    if (applicantId) {
      await storage.updateApplicantStatus(
        applicantId,
        "completed",
        new Date().toISOString()
      );
    }

    return NextResponse.json({ verified: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hata oluştu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
