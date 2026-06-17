import { cookies } from "next/headers";
import { checkCloak } from "@/lib/cloaker";

const OFFER_COOKIE = "offer_pass";

/**
 * Offer tespiti: önce cloak/check sırasında set edilen cookie (form submit'te
 * fbclid URL'de olmadığı için yeniden cloak çağrısı white dönebilir).
 */
export async function isOfferRequest(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(OFFER_COOKIE)?.value === "1") return true;

  const result = await checkCloak(request);
  if (!result) return true;
  return result.page === "offer";
}
