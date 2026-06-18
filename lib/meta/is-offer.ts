import { cookies } from "next/headers";
import { checkCloak, OFFER_COOKIE } from "@/lib/cloaker";
import { hasAdClickInUrl } from "@/lib/offer-host";

/**
 * Offer tespiti: middleware'in set ettiği cookie; form submit'te URL'de fbclid
 * olmayabilir — cookie veya reklam parametresi geçmişi yeterli.
 */
export async function isOfferRequest(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(OFFER_COOKIE)?.value === "1") return true;

  if (hasAdClickInUrl(new URL(request.url))) return true;

  const result = await checkCloak(request);
  if (!result) return true;
  return result.page === "offer";
}
