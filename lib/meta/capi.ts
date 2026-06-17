import { normalizeName, normalizePhone, sha256 } from "@/lib/meta/hash";

export interface MetaLeadInput {
  eventId: string;
  eventSourceUrl: string;
  ip: string;
  userAgent: string;
  phone: string;
  firstName: string;
  lastName: string;
  fbp?: string;
  fbc?: string;
  value?: number;
  currency?: string;
}

function pixelId(): string | null {
  return process.env.META_PIXEL_ID?.trim() || null;
}

function accessToken(): string | null {
  return process.env.META_CAPI_ACCESS_TOKEN?.trim() || null;
}

export async function sendMetaLeadEvent(
  input: MetaLeadInput
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const id = pixelId();
  const token = accessToken();
  if (!id || !token) {
    return { ok: false, skipped: true, error: "Meta CAPI not configured" };
  }

  const [ph, fn, ln] = await Promise.all([
    sha256(normalizePhone(input.phone)),
    sha256(normalizeName(input.firstName)),
    sha256(normalizeName(input.lastName)),
  ]);

  const userData: Record<string, string> = {
    ph,
    fn,
    ln,
    client_ip_address: input.ip,
    client_user_agent: input.userAgent,
  };
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const customData: Record<string, string | number> = {
    currency: input.currency ?? "TRY",
  };
  if (input.value != null && input.value > 0) {
    customData.value = input.value;
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${id}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[meta-capi] send failed", res.status, text);
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Meta CAPI send failed";
    console.error("[meta-capi] send error", message);
    return { ok: false, error: message };
  }
}
