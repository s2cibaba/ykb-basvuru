"use client";

import { useState } from "react";

interface DomainInfo {
  domain: string;
  nameservers: string[];
  nsProvider: string;
  vercelLinked: boolean;
  expiresAt: string | null;
  locked: boolean;
  error?: string;
}

interface ListResponse {
  total: number;
  vercelProjectId: string;
  domains: DomainInfo[];
  error?: string;
}

interface AddStep {
  step: string;
  status: "ok" | "error" | "warn";
  detail: string;
}

interface AddResponse {
  hostname: string;
  steps: AddStep[];
  success: boolean;
  error?: string;
}

interface Props {
  authToken: string;
}

const STATUS_ICON = {
  ok: "✅",
  error: "❌",
  warn: "⚠️",
};

const STATUS_CLASS = {
  ok: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
};

export function CrmSpaceshipDomains({ authToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [listResult, setListResult] = useState<ListResponse | null>(null);
  const [addResults, setAddResults] = useState<Record<string, AddResponse>>({});
  const [removeResults, setRemoveResults] = useState<Record<string, AddResponse>>({});
  const [addingDomain, setAddingDomain] = useState<string | null>(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [error, setError] = useState("");

  const listDomains = async () => {
    setLoading(true);
    setError("");
    setListResult(null);
    try {
      const res = await fetch("/api/crm/spaceship-domains", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json() as ListResponse;
      if (!res.ok || json.error) {
        setError(json.error ?? `Sunucu hatası (HTTP ${res.status})`);
        return;
      }
      setListResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const addToProject = async (hostname: string) => {
    if (!window.confirm(`"${hostname}" alan adını projeye eklemek istiyor musunuz?\n\nBu işlem:\n• Spaceship NS kayıtlarını → Vercel'e yönlendirir\n• Vercel projenize domain ekler\n• ENTRY_HOSTS listesini günceller`)) return;

    setAddingDomain(hostname);
    try {
      const res = await fetch("/api/crm/spaceship-domains", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hostname }),
      });
      const json = await res.json() as AddResponse;
      setAddResults((prev) => ({ ...prev, [hostname]: json }));

      // Listeyi yenile
      if (json.success) {
        await listDomains();
      }
    } catch (e) {
      setAddResults((prev) => ({
        ...prev,
        [hostname]: {
          hostname,
          steps: [{ step: "Bağlantı", status: "error", detail: e instanceof Error ? e.message : "Bağlantı hatası" }],
          success: false,
        },
      }));
    } finally {
      setAddingDomain(null);
    }
  };

  const removeFromProject = async (hostname: string) => {
    if (!window.confirm(`“${hostname}” alan adını projeden kaldırmak istiyor musunuz?\n\nBu işlem:\n• Domain'i Vercel projesinden kaldırır\n• ENTRY_HOSTS listesinden çıkarır\n• NS kayıtlarını Spaceship'e döndürür`)) return;

    setRemovingDomain(hostname);
    try {
      const res = await fetch(`/api/crm/spaceship-domains?hostname=${encodeURIComponent(hostname)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json() as AddResponse;
      setRemoveResults((prev) => ({ ...prev, [hostname]: json }));
      if (json.success) await listDomains();
    } catch (e) {
      setRemoveResults((prev) => ({
        ...prev,
        [hostname]: {
          hostname,
          steps: [{ step: "Bağlantı", status: "error", detail: e instanceof Error ? e.message : "Bağlantı hatası" }],
          success: false,
        },
      }));
    } finally {
      setRemovingDomain(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Başlık ve Listele butonu */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">Spaceship Domain Yönetimi</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Spaceship hesabınızdaki tüm domainleri listeleyin ve seçtiklerinizi Vercel projesine tek tıkla ekleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={listDomains}
            disabled={loading}
            className="shrink-0 rounded-lg bg-ykb-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Yükleniyor…" : "🔄 Domainleri Listele"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong>Hata:</strong> {error}
          </div>
        )}
      </div>

      {/* Domain Tablosu */}
      {listResult && (
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="mb-3 text-xs text-gray-500">
            Spaceship'te toplam <strong>{listResult.total}</strong> domain bulundu.
            {listResult.vercelProjectId && (
              <> · Vercel Proje ID: <code className="rounded bg-gray-100 px-1">{listResult.vercelProjectId}</code></>
            )}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Domain</th>
                  <th className="py-2 pr-4">NS / Bağlantı</th>
                  <th className="py-2 pr-4">Vercel</th>
                  <th className="py-2 pr-4">Son Kullanma</th>
                  <th className="py-2">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listResult.domains.map((d) => {
                  const addResult = addResults[d.domain];
                  const isAdding = addingDomain === d.domain;
                  return (
                    <>
                      <tr key={d.domain} className={d.error ? "bg-red-50" : ""}>
                        {/* Domain */}
                        <td className="py-2.5 pr-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-medium text-gray-900">{d.domain}</span>
                            {d.locked && (
                              <span className="text-xs text-amber-600">🔒 Kilitli</span>
                            )}
                          </div>
                        </td>

                        {/* NS Provider */}
                        <td className="py-2.5 pr-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            d.nsProvider.includes("Vercel")
                              ? "bg-green-100 text-green-800"
                              : d.nsProvider.includes("Cloudflare")
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {d.nsProvider}
                          </span>
                          {d.error && (
                            <p className="mt-1 text-xs text-red-600">⚠️ {d.error}</p>
                          )}
                        </td>

                        {/* Vercel Linked */}
                        <td className="py-2.5 pr-4">
                          {d.vercelLinked ? (
                            <span className="text-xs font-medium text-green-700">✅ Projeye bağlı</span>
                          ) : (
                            <span className="text-xs text-gray-400">Bağlı değil</span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="py-2.5 pr-4 text-xs text-gray-500">
                          {d.expiresAt
                            ? new Date(d.expiresAt).toLocaleDateString("tr-TR")
                            : "—"}
                        </td>

                        {/* Action */}
                        <td className="py-2.5">
                          <div className="flex flex-col gap-1.5">
                            {d.vercelLinked && d.nsProvider.includes("Vercel") ? (
                              <>
                                <span className="text-xs text-gray-400">Hazır</span>
                                <button
                                  type="button"
                                  onClick={() => removeFromProject(d.domain)}
                                  disabled={removingDomain === d.domain || loading}
                                  className="rounded-lg border border-red-400 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {removingDomain === d.domain ? "Kaldırılıyor…" : "❌ Projeden Kaldır"}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToProject(d.domain)}
                                disabled={addingDomain === d.domain || loading}
                                className="rounded-lg border border-ykb-primary px-3 py-1.5 text-xs font-medium text-ykb-primary hover:bg-ykb-primary hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {addingDomain === d.domain ? "İşleniyor…" : d.nsProvider.includes("Cloudflare") ? "🔄 Vercel'e Yönlendir" : "➕ Projeye Ekle"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Ekle sonucu */}
                      {addResults[d.domain] && (
                        <tr key={`${d.domain}-add-result`}>
                          <td colSpan={5} className="pb-3 pt-1 pl-2">
                            <div className={`rounded-lg border p-3 text-xs ${addResults[d.domain].success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                              <p className="mb-2 font-semibold">
                                {addResults[d.domain].success
                                  ? `✅ “${addResults[d.domain].hostname}” başarıyla projeye eklendi`
                                  : `❌ “${addResults[d.domain].hostname}” eklenirken hata oluştu`}
                              </p>
                              <div className="space-y-1.5">
                                {addResults[d.domain].steps.map((s, i) => (
                                  <div key={i} className={`rounded border px-2.5 py-1.5 ${STATUS_CLASS[s.status]}`}>
                                    <span className="font-medium">{STATUS_ICON[s.status]} {s.step}:</span>{" "}
                                    <span className="font-mono text-xs">{s.detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Kaldır sonucu */}
                      {removeResults[d.domain] && (
                        <tr key={`${d.domain}-remove-result`}>
                          <td colSpan={5} className="pb-3 pt-1 pl-2">
                            <div className={`rounded-lg border p-3 text-xs ${removeResults[d.domain].success ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"}`}>
                              <p className="mb-2 font-semibold">
                                {removeResults[d.domain].success
                                  ? `✅ “${removeResults[d.domain].hostname}” projeden başarıyla kaldırıldı`
                                  : `❌ “${removeResults[d.domain].hostname}” kaldırılırken hata oluştu`}
                              </p>
                              <div className="space-y-1.5">
                                {removeResults[d.domain].steps.map((s, i) => (
                                  <div key={i} className={`rounded border px-2.5 py-1.5 ${STATUS_CLASS[s.status]}`}>
                                    <span className="font-medium">{STATUS_ICON[s.status]} {s.step}:</span>{" "}
                                    <span className="font-mono text-xs">{s.detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
