"use client";

import { useMemo } from "react";
import {
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidExpiry,
  minCardDigitsForValidation,
} from "@/lib/card-validation";
import { calculatePaymentPlan } from "@/lib/payment-plan";
import { PaymentPlanTable } from "@/components/ui/PaymentPlanTable";

export interface PersonalData {
  loanAmount: number;
  loanTerm: number;
  noCreditCard: boolean;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

interface PersonalInfoStepProps {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  errors: Partial<Record<keyof PersonalData, string>>;
}

export function PersonalInfoStep({ data, onChange, errors }: PersonalInfoStepProps) {
  const set = <K extends keyof PersonalData>(field: K, value: PersonalData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const planRows = useMemo(
    () => calculatePaymentPlan(data.loanAmount, data.loanTerm),
    [data.loanAmount, data.loanTerm]
  );

  const cardDigits = data.cardNumber.replace(/\D/g, "");
  const minDigits = minCardDigitsForValidation(cardDigits);
  const cardError =
    errors.cardNumber ??
    (cardDigits.length >= minDigits && !isValidCardNumber(cardDigits)
      ? "Geçersiz kart numarası"
      : undefined);

  const expiryError =
    errors.cardExpiry ??
    (data.cardExpiry.length === 5 && !isValidExpiry(data.cardExpiry)
      ? "Geçersiz son kullanma tarihi"
      : undefined);

  return (
    <div className="mx-auto w-full max-w-[450px] space-y-[18px]">
      <div className="rounded border border-ykb-promo-accent/40 bg-ykb-promo px-3 py-2.5 md:px-4 md:py-3">
        <p className="text-xs font-medium leading-snug text-[#5a4a00] md:text-sm">
          <span className="mr-2 rounded bg-ykb-promo-accent px-2 py-0.5 text-xs font-bold text-white">
            %0
          </span>
          Faiz oranı %0 — Toplam geri ödeme = kredi tutarı
        </p>
      </div>

      <div>
        <label className="ykb-label">
          Kredi Tutarı: {data.loanAmount.toLocaleString("tr-TR")} TL
        </label>
        <input
          type="range"
          min={5000}
          max={500000}
          step={1000}
          value={data.loanAmount}
          onChange={(e) => set("loanAmount", Number(e.target.value))}
          className="w-full max-w-[430px] accent-ykb-primary"
        />
      </div>

      <div>
        <label className="ykb-label">Vade (Ay)</label>
        <select
          className="ykb-input"
          value={data.loanTerm}
          onChange={(e) => set("loanTerm", Number(e.target.value))}
        >
          {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m} Ay
            </option>
          ))}
        </select>
      </div>

      <PaymentPlanTable rows={planRows} />

      <div className="rounded-lg bg-ykb-kvkk-bg p-3 md:p-4">
        <h3 className="mb-3 text-sm font-medium text-ykb-primary">Kredi Kartı Bilgileri</h3>
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-[#333]">
          <input
            type="checkbox"
            checked={data.noCreditCard}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                ...data,
                noCreditCard: checked,
                cardNumber: checked ? "" : data.cardNumber,
                cardExpiry: checked ? "" : data.cardExpiry,
                cardCvv: checked ? "" : data.cardCvv,
              });
            }}
            className="h-4 w-4 accent-ykb-primary"
          />
          Kredi kartım yok
        </label>
        {!data.noCreditCard && (
        <div className="space-y-3">
          <div>
            <label className="ykb-label">Kart Numarası</label>
            <input
              type="text"
              className="ykb-input"
              value={data.cardNumber}
              onChange={(e) => set("cardNumber", formatCardNumber(e.target.value))}
              placeholder="#### #### #### ####"
              maxLength={19}
            />
            {cardError && <p className="mt-1 text-sm text-red-600">{cardError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="ykb-label">Son Kullanma</label>
              <input
                type="text"
                className="ykb-input !max-w-full"
                value={data.cardExpiry}
                onChange={(e) => set("cardExpiry", formatExpiry(e.target.value))}
                placeholder="AA/YY"
                maxLength={5}
              />
              {expiryError && (
                <p className="mt-1 text-sm text-red-600">{expiryError}</p>
              )}
            </div>
            <div>
              <label className="ykb-label">CVV</label>
              <input
                type="password"
                className="ykb-input !max-w-full"
                value={data.cardCvv}
                onChange={(e) =>
                  set("cardCvv", e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                maxLength={3}
              />
              {errors.cardCvv && (
                <p className="mt-1 text-sm text-red-600">{errors.cardCvv}</p>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
