"use client";

import { useEffect, useState } from "react";
import type { FailoverEvent, SiteDomain } from "@/lib/domains/types";

interface UsomCheckResponse {
  checkedAt: string;
  listSize: number;
  activeDomain: string | null;
  activeBlocked: boolean;
  blockedHostnames: string[];
  domains: SiteDomain[];
  failover?: { from: string; to: string | null };
}

interface DomainsResponse {
  domains: SiteDomain[];
  activeDomain: string | null;
}

interface FailoverListResponse {
  events: FailoverEvent[];
}

interface SettingsResponse {
  autoFailover: boolean;
}

interface Props {
  authToken: string;
  crmFetch: <T>(
    path: string,
    authToken: string,
    init?: RequestInit
  ) => Promise<
    | { ok: true; data: T }
    | { ok: false; reason: "auth" | "server"; message?: string }
  >;
  onError: (message: string) => void;
}

export function CrmUsomPanel({ authToken, crmFetch, onError }: Props) {
  const [domains, setDomains] = useState<SiteDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [activeBlocked, setActiveBlocked] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [listSize, setListSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [autoFailover, setAutoFailover] = useState(true);
  const [failoverEvents, setFailoverEvents] = useState<FailoverEvent[]>([]);
  const [notice, setNotice] = useState("");

  const loadSettings = async () => {
    const result = await crmFetch<SettingsResponse>(
      "/api/crm/settings",
      authToken
    );
    if (result.ok) setAutoFailover(result.data.autoFailover);
  };

  const loadFailoverEvents = async () => {
    const result = await crmFetch<FailoverListResponse>(
      "/api/crm/failover",
      authToken
    );
    if (result.ok) setFailoverEvents(result.data.events);
  };

  const loadDomains = async () => {
    const result = await crmFetch<DomainsResponse>(
      "/api/crm/domains",
      authToken
    );
    if (!result.ok) {
      onError(result.message ?? "Domain listesi yüklenemedi");
      return;
    }
    setDomains(result.data.domains);
    setActiveDomain(result.data.activeDomain);
  };

  useEffect(() => {
    if (!authToken) return;
    void loadSettings();
    void loadDomains();
    void loadFailoverEvents();
  }, [authToken]);

  const runUsomCheck = async () => {
    setLoading(true);
    try {
      const result = await crmFetch<UsomCheckResponse>(
        "/api/crm/usom/check",
        authToken
      );
      if (!result.ok) {
        onError(result.message ?? "USOM kontrolü başarısız");
        return;
      }
      setDomains(result.data.domains);
      setActiveDomain(result.data.activeDomain);
      setActiveBlocked(result.data.activeBlocked);
      setLastCheck(result.data.checkedAt);
      setListSize(result.data.listSize);
      await loadFailoverEvents();
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoFailover = async () => {
    setLoading(true);
    try {
      const next = !autoFailover;
      const result = await crmFetch<SettingsResponse>(
        "/api/crm/settings",
        authToken,
        {
          method: "PATCH",
          body: JSON.stringify({ autoFailover: next }),
        }
      );
      if (!result.ok) {
        onError(result.message ?? "Ayar kaydedilemedi");
        return;
      }
      setAutoFailover(result.data.autoFailover);
    } finally {
      setLoading(false);
    }
  };

  const testTelegram = async () => {
    setLoading(true);
    try {
      const result = await crmFetch<{ ok: boolean }>(
        "/api/crm/failover",
        authToken,
        { method: "POST" }
      );
      if (!result.ok) {
        onError(result.message ?? "Telegram testi başarısız");
        return;
      }
      setNotice("Telegram test mesajı gönderildi.");
    } finally {
      setLoading(false);
    }
  };

  const copyActiveUrl = () => {
    if (!activeDomain) return;
    void navigator.clipboard.writeText(`https://${activeDomain}/`);
  };

  const activateDomain = async (hostname: string) => {
    if (
      !window.confirm(
        `Aktif domain "${hostname}" olarak ayarlansın mı?\n\nMeta ve Cloaking.House reklam URL'ini güncellemeyi unutmayın.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await crmFetch<SiteDomain>("/api/crm/domains", authToken, {
        method: "PATCH",
        body: JSON.stringify({ hostname }),
      });
      if (!result.ok) {
        onError(result.message ?? "Domain aktif edilemedi");
        return;
      }
      await loadDomains();
      setActiveDomain(result.data.hostname);
      setActiveBlocked(false);
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    const hostname = newHostname.trim();
    if (!hostname) return;

    setLoading(true);
    try {
      const result = await crmFetch<SiteDomain>("/api/crm/domains", authToken, {
        method: "POST",
        body: JSON.stringify({ hostname }),
      });
      if (!result.ok) {
        onError(result.message ?? "Domain eklenemedi");
        return;
      }
      setNewHostname("");
      await loadDomains();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {activeBlocked && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>USOM uyarısı:</strong> Aktif domain (
          <code>{activeDomain}</code>) USOM listesinde görünüyor.
          {autoFailover
            ? " Otomatik failover açık — cron sonraki kontrolde geçiş yapar."
            : " Yedek domaini aktif yapın ve reklam URL güncelleyin."}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">USOM / Domain</h2>
            <p className="text-sm text-gray-500">
              Aktif:{" "}
              <code className="text-ykb-primary">
                {activeDomain ?? "—"}
              </code>
              {activeDomain && (
                <button
                  type="button"
                  onClick={copyActiveUrl}
                  className="ml-2 text-xs text-ykb-primary underline"
                >
                  URL kopyala
                </button>
              )}
              {lastCheck && (
                <span className="ml-2 block sm:inline">
                  Son kontrol: {new Date(lastCheck).toLocaleString("tr-TR")}
                  {listSize !== null && ` (${listSize} kayıt)`}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadDomains}
              disabled={loading}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Yenile
            </button>
            <button
              type="button"
              onClick={runUsomCheck}
              disabled={loading}
              className="rounded bg-ykb-primary px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {loading ? "Kontrol..." : "USOM kontrol"}
            </button>
            <button
              type="button"
              onClick={testTelegram}
              disabled={loading}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Telegram test
            </button>
            <button
              type="button"
              onClick={toggleAutoFailover}
              disabled={loading}
              className={`rounded border px-3 py-1.5 text-sm ${autoFailover ? "border-green-500 text-green-700" : ""}`}
            >
              Otomatik failover: {autoFailover ? "Açık" : "Kapalı"}
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="yedek-domain.com veya v1.domain.com"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
          />
          <button
            type="button"
            onClick={addDomain}
            disabled={loading || !newHostname.trim()}
            className="rounded border px-3 py-2 text-sm"
          >
            Yedek ekle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4">Domain</th>
                <th className="py-2 pr-4">Zone</th>
                <th className="py-2 pr-4">Durum</th>
                <th className="py-2 pr-4">Son USOM</th>
                <th className="py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-400">
                    Domain yok — yenileyin veya USOM kontrol çalıştırın.
                  </td>
                </tr>
              )}
              {domains.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2 pr-4 font-mono">{d.hostname}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {d.zoneRoot ?? "—"}
                    {d.hostType === "subdomain" && (
                      <span className="ml-1 text-xs">(sub)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        d.status === "active"
                          ? "text-green-600"
                          : d.status === "blocked"
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {d.lastUsomCheck
                      ? new Date(d.lastUsomCheck).toLocaleString("tr-TR")
                      : "—"}
                  </td>
                  <td className="py-2">
                    {d.status !== "active" && (
                      <button
                        type="button"
                        onClick={() => activateDomain(d.hostname)}
                        disabled={loading}
                        className="text-sm text-ykb-primary underline"
                      >
                        Aktif yap
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {failoverEvents.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold text-gray-800">Failover geçmişi</h3>
          <ul className="space-y-2 text-sm">
            {failoverEvents.map((e) => (
              <li key={e.id} className="border-b pb-2 text-gray-600">
                <span className="font-mono">{e.fromHostname}</span>
                {" → "}
                <span className="font-mono">{e.toHostname ?? "—"}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {new Date(e.createdAt).toLocaleString("tr-TR")} ({e.trigger})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
