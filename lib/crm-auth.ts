export type CrmRole = "admin" | "super";

export function getCrmPassword(): string {
  const raw = process.env.CRM_PASSWORD;
  if (!raw?.trim()) return "admin123";
  return raw.trim();
}

export function getSuperToken(): string {
  return `${getCrmPassword()}-super`;
}

export function isCrmAuthorized(authHeader: string | null): CrmRole | false {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  
  if (token === getSuperToken()) return "super";
  if (token === getCrmPassword()) return "admin";
  
  return false;
}
