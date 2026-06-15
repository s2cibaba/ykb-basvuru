"use client";

import { useCallback, useState } from "react";

interface CaptchaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Captcha({ value, onChange, error }: CaptchaProps) {
  const [key, setKey] = useState(0);

  const refresh = useCallback(() => {
    setKey((k) => k + 1);
    onChange("");
  }, [onChange]);

  return (
    <div>
      <label className="ykb-label">Güvenlik Kodu</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="ykb-input !w-[120px] !max-w-[120px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={6}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={key}
          src={`/api/captcha?t=${key}`}
          alt="captcha"
          width={166}
          height={40}
          className="h-10 rounded-sm border border-[#b6b6b6]"
        />
        <button
          type="button"
          onClick={refresh}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-ykb-primary text-white hover:bg-[#003d7a]"
          aria-label="Yenile"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
