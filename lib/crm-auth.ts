export function getCrmPassword(): string {
  const raw = process.env.CRM_PASSWORD;
  if (!raw?.trim()) return "admin123";
  return raw.trim();
}

export function isCrmAuthorized(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7).trim() === getCrmPassword();
}
