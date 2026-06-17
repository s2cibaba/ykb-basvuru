import type { ApplicantWithAttempts } from "@/lib/storage/types";
import { mapApplicantToLeadflow } from "@/lib/leadflow/map-applicant";

function webhookUrl(): string | null {
  const url = process.env.LEADFLOW_WEBHOOK_URL?.trim();
  return url || null;
}

export async function pushLeadToLeadflow(
  applicant: ApplicantWithAttempts,
  sourceHost: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const url = webhookUrl();
  if (!url) {
    console.warn("[leadflow] LEADFLOW_WEBHOOK_URL tanımlı değil, push atlandı");
    return { ok: false, skipped: true, error: "LEADFLOW_WEBHOOK_URL missing" };
  }

  const payload = mapApplicantToLeadflow(applicant, sourceHost);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[leadflow] push failed", res.status, text);
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Leadflow push failed";
    console.error("[leadflow] push error", message);
    return { ok: false, error: message };
  }
}
