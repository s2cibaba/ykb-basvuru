import { formatCurrency, type PaymentPlanRow } from "@/lib/payment-plan";

interface PaymentPlanTableProps {
  rows: PaymentPlanRow[];
}

export function PaymentPlanTable({ rows }: PaymentPlanTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 max-w-[430px] overflow-hidden rounded border border-ykb-input-border">
      <table className="w-full text-sm">
        <thead className="bg-ykb-kvkk-bg">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Ay</th>
            <th className="px-3 py-2 text-right font-medium">Taksit</th>
            <th className="px-3 py-2 text-right font-medium">Kalan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-t border-ykb-input-border">
              <td className="px-3 py-2">{row.month}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.payment)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.remaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bg-ykb-promo px-3 py-1.5 text-xs text-ykb-promo-accent">
        Faiz oranı: %0
      </p>
    </div>
  );
}
