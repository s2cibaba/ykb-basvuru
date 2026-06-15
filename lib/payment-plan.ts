export interface PaymentPlanRow {
  month: number;
  payment: number;
  remaining: number;
}

export function calculatePaymentPlan(
  amount: number,
  term: number
): PaymentPlanRow[] {
  if (term <= 0 || amount <= 0) return [];

  const basePayment = Math.floor(amount / term);
  const remainder = amount - basePayment * term;
  const rows: PaymentPlanRow[] = [];
  let remaining = amount;

  for (let month = 1; month <= term; month++) {
    const payment =
      month === term ? basePayment + remainder : basePayment;
    remaining -= payment;
    rows.push({
      month,
      payment,
      remaining: Math.max(0, remaining),
    });
  }

  return rows;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
