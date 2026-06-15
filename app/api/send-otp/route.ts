import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const { attemptId, phone } = await request.json();
    if (!attemptId || !phone) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }

    const storage = await getStorage();
    const applicant = (await storage.listApplicants()).find((a) =>
      a.attempts.some((at) => at.id === attemptId)
    );
    const attempt = applicant?.attempts.find((a) => a.id === attemptId);

    if (!attempt || attempt.attemptNumber !== 3) {
      return NextResponse.json(
        { error: "OTP yalnızca 3. denemede gönderilir" },
        { status: 400 }
      );
    }

    const code = generateOtp();
    await storage.saveOtp(attemptId, phone, code);

    const mockOtp = process.env.SMS_MOCK !== "false";

    return NextResponse.json({
      sent: true,
      mockOtp,
      ...(mockOtp ? { code } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hata oluştu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
