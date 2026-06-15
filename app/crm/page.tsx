"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicantWithAttempts } from "@/lib/storage/types";
import { CrmAccordion } from "@/components/crm/CrmAccordion";

async function fetchCrmApplicants(authToken: string) {
  const res = await fetch("/api/crm/applicants", {
    headers: { Authorization: `Bearer ${authToken.trim()}` },
  });

  if (res.status === 401) {
    return { ok: false as const, reason: "auth" as const };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false as const,
      reason: "server" as const,
      message: (body as { error?: string }).error ?? "Sunucu hatası",
    };
  }

  const data = (await res.json()) as ApplicantWithAttempts[];
  return { ok: true as const, data };
}

export default function CrmPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantWithAttempts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadApplicants = useCallback(async (authToken: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCrmApplicants(authToken);

      if (!result.ok) {
        if (result.reason === "auth") {
          sessionStorage.removeItem("crm_token");
          setToken(null);
          setApplicants([]);
          setError("Şifre hatalı veya oturum süresi doldu. Tekrar giriş yapın.");
          return;
        }
        setError(result.message ?? "Veri yüklenemedi");
        return;
      }

      setApplicants(result.data);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Uygulamanın çalıştığından emin olun (npm run dev)."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("crm_token");
    if (saved) {
      setToken(saved);
      loadApplicants(saved);
    }
  }, [loadApplicants]);

  const login = async () => {
    if (!password.trim()) {
      setError("Şifre giriniz");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await fetchCrmApplicants(password.trim());

      if (!result.ok) {
        if (result.reason === "auth") {
          setError("Şifre hatalı. Varsayılan şifre: admin123");
          return;
        }
        setError(result.message ?? "Giriş yapılamadı");
        return;
      }

      sessionStorage.setItem("crm_token", password);
      setToken(password);
      setApplicants(result.data);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Uygulamanın çalıştığından emin olun (npm run dev)."
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("crm_token");
    setToken(null);
    setApplicants([]);
    setError("");
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
          <h1 className="mb-4 text-xl font-bold text-gray-800">CRM Giriş</h1>
          {error && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <input
            type="password"
            className="mb-3 w-full rounded border px-3 py-2"
            placeholder="Şifre (varsayılan: admin123)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="w-full rounded bg-ykb-primary py-2 text-white disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Başvurular</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => token && loadApplicants(token)}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Yenile
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white"
            >
              Çıkış
            </button>
          </div>
        </div>

        {loading && <p className="mb-4 text-gray-500">Yükleniyor...</p>}
        {error && <p className="mb-4 text-red-600">{error}</p>}

        <CrmAccordion applicants={applicants} />
      </div>
    </div>
  );
}
