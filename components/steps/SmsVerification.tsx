"use client";

import { useEffect, useState } from "react";

interface SmsVerificationProps {
  phone: string;
  attemptId: string;
  applicantId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function SmsVerification({
  phone,
  attemptId,
  applicantId,
  onVerified,
  onCancel,
}: SmsVerificationProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderilemedi");
      setSent(true);
      if (data.mockOtp && data.code) setMockCode(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, code, applicantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Doğrulanamadı");
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="modal-card w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-lg sm:p-6">
        <h2 className="mb-2 text-lg font-medium text-ykb-primary sm:text-xl">SMS Doğrulama</h2>
        <p className="mb-4 text-sm text-[#666]">
          {phone} numarasına gönderilen 6 haneli kodu giriniz.
        </p>

        {loading && !sent && (
          <p className="text-center text-sm text-[#666]">Kod gönderiliyor...</p>
        )}

        {sent && (
          <>
            {mockCode && (
              <p className="mb-3 rounded bg-yellow-50 p-2 text-center text-sm text-yellow-800">
                Demo OTP: <strong>{mockCode}</strong>
              </p>
            )}
            <input
              type="text"
              className="ykb-input mb-3 !max-w-full"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6 haneli kod"
              maxLength={6}
            />
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded border border-ykb-input-border py-2.5 text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={verify}
                disabled={loading || code.length !== 6}
                className="ykb-btn-primary flex-1"
              >
                {loading ? "Doğrulanıyor..." : "Doğrula"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
