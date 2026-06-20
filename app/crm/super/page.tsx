"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminPage() {
  const router = useRouter();
  const [step, setStep] = useState<"send" | "verify">("send");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const sendCode = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/crm/auth/super-admin/send-code", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kod gönderilemedi.");
        return;
      }
      setSuccessMsg(data.message || "Kod Telegram'a gönderildi.");
      setStep("verify");
    } catch (err) {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setError("Lütfen kodu girin.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/crm/auth/super-admin/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hatalı kod.");
        return;
      }
      
      // Başarılı!
      sessionStorage.setItem("crm_token", data.token);
      router.push("/crm");
    } catch (err) {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold text-gray-800">Super Admin Girişi</h1>
        
        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMsg}
          </p>
        )}

        {step === "send" ? (
          <div>
            <p className="mb-4 text-sm text-gray-600">
              Super Admin paneline erişmek için Telegram üzerinden onay kodu almanız gerekmektedir.
            </p>
            <button
              type="button"
              onClick={sendCode}
              disabled={loading}
              className="w-full rounded bg-gray-800 py-2 text-white font-medium hover:bg-gray-700 disabled:opacity-60"
            >
              {loading ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-gray-600">
              Telegram'a gönderilen 6 haneli doğrulama kodunu girin.
            </p>
            <input
              type="text"
              className="mb-3 w-full rounded border px-3 py-2 font-mono tracking-widest text-center text-lg"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="w-full rounded bg-ykb-primary py-2 text-white font-medium disabled:opacity-60"
            >
              {loading ? "Doğrulanıyor..." : "Giriş Yap"}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={loading}
              className="mt-3 w-full text-sm text-gray-500 underline"
            >
              Kodu tekrar gönder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
