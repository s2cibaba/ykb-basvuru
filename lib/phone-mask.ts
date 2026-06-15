export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  let formatted = "0";
  if (digits.length > 1) {
    formatted += ` (${digits.slice(1, 4)}`;
  }
  if (digits.length >= 4) {
    formatted += digits.length > 4 ? ")" : "";
    formatted += ` ${digits.slice(4, 7)}`;
  }
  if (digits.length >= 7) {
    formatted += ` ${digits.slice(7, 9)}`;
  }
  if (digits.length >= 9) {
    formatted += ` ${digits.slice(9, 11)}`;
  }
  return formatted;
}

export function phoneToDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
