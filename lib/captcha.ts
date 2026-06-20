const captchaStore = new Map<string, { code: string; expiresAt: number }>();

export function generateCaptchaCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function setCaptcha(sessionId: string, code: string): void {
  captchaStore.set(sessionId, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyCaptcha(sessionId: string, input: string): boolean {
  const entry = captchaStore.get(sessionId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    captchaStore.delete(sessionId);
    return false;
  }
  const valid = entry.code === input.trim();
  if (valid) captchaStore.delete(sessionId);
  return valid;
}

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, val] of captchaStore.entries()) {
    if (now > val.expiresAt) captchaStore.delete(key);
  }
}
