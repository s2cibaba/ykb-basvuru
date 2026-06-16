export type CardBrand =
  | "visa"
  | "mastercard"
  | "troy"
  | "amex"
  | "discover"
  | "unknown";

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^9792/.test(digits)) return "troy";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "unknown";
}

export function expectedCardLengths(brand: CardBrand): number[] {
  if (brand === "amex") return [15];
  if (brand === "discover") return [16, 19];
  return [16];
}

export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits) return false;

  const brand = detectCardBrand(digits);
  const lengths = expectedCardLengths(brand);

  if (brand === "unknown") {
    if (digits.length < 13 || digits.length > 19) return false;
  } else if (!lengths.includes(digits.length)) {
    return false;
  }

  return luhnCheck(digits);
}

export function minCardDigitsForValidation(digits: string): number {
  const brand = detectCardBrand(digits);
  if (brand === "amex") return 15;
  return 16;
}

export function isValidExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 0);
  return exp >= new Date(now.getFullYear(), now.getMonth(), 1);
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  const brand = detectCardBrand(digits);
  const maxLen = brand === "amex" ? 15 : 19;
  const trimmed = digits.slice(0, maxLen);

  if (brand === "amex") {
    return trimmed
      .replace(/^(\d{4})(\d{6})(\d{0,5})$/, (_, a, b, c) =>
        c ? `${a} ${b} ${c}` : b ? `${a} ${b}` : a
      )
      .trim();
  }

  return trimmed.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
