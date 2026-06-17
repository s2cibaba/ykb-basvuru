import type { ApplicantWithAttempts } from "@/lib/storage/types";
import { phoneToDigits } from "@/lib/phone-mask";
import { formatApplicantNotes } from "@/lib/leadflow/format-notes";

export interface LeadflowLeadPayload {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  source: string;
  notes: string;
}

export function normalizePhoneE164(phone: string): string {
  const digits = phoneToDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function mapApplicantToLeadflow(
  applicant: ApplicantWithAttempts,
  sourceHost: string
): LeadflowLeadPayload {
  const attempts = [...applicant.attempts].sort(
    (a, b) => a.attemptNumber - b.attemptNumber
  );
  const finalAttempt =
    attempts.find((a) => a.loanAmount > 0) ?? attempts[attempts.length - 1];

  return {
    firstName: finalAttempt?.firstName?.trim() || "—",
    lastName: finalAttempt?.lastName?.trim() || "—",
    phone: normalizePhoneE164(finalAttempt?.phone ?? ""),
    country: "TR",
    source: "api",
    notes: formatApplicantNotes(applicant, sourceHost),
  };
}
