export function isValidTCKN(tc: string): boolean {
  return /^\d{11}$/.test(tc);
}
