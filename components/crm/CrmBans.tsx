"use client";

import { useState } from "react";
import type { BanEntry, BanType } from "@/lib/storage/types";

interface CrmBansProps {
  bans: BanEntry[];
  onAddBan: (type: BanType, value: string, reason?: string) => Promise<void>;
  onRemoveBan: (id: string) => Promise<void>;
}

const TYPE_LABELS: Record<BanType, string> = {
  ip: "IP",
  session: "Oturum",
  tc: "TC Kimlik",
};

export function CrmBans({ bans, onAddBan, onRemoveBan }: CrmBansProps) {
  const [type, setType] = useState<BanType>("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      await onAddBan(type, value.trim(), reason.trim() || undefined);
      setValue("");
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Yeni Ban</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BanType)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="ip">IP Adresi</option>
            <option value="session">Oturum ID</option>
            <option value="tc">TC Kimlik</option>
          </select>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Değer"
            className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sebep (opsiyonel)"
            className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !value.trim()}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {loading ? "Ekleniyor..." : "Banla"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {bans.length === 0 ? (
          <p className="px-4 py-10 text-center text-gray-400">Aktif ban yok</p>
        ) : (
          <>
            <div className="hidden grid-cols-[0.6fr_1fr_1fr_1fr_80px] gap-2 border-b bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
              <span>Tür</span>
              <span>Değer</span>
              <span>Sebep</span>
              <span>Tarih</span>
              <span />
            </div>
            {bans.map((ban) => (
              <div
                key={ban.id}
                className="border-b px-4 py-3 text-sm last:border-b-0 md:grid md:grid-cols-[0.6fr_1fr_1fr_1fr_80px] md:items-center md:gap-2"
              >
                <span className="font-medium text-gray-700">
                  {TYPE_LABELS[ban.type]}
                </span>
                <span className="break-all font-mono text-xs">{ban.value}</span>
                <span className="text-gray-600">{ban.reason ?? "—"}</span>
                <span className="text-xs text-gray-500">
                  {new Date(ban.createdAt).toLocaleString("tr-TR")}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveBan(ban.id)}
                  className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 md:mt-0"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
