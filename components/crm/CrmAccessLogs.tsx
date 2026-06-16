"use client";

import type { AccessLogEntry } from "@/lib/storage/types";

interface CrmAccessLogsProps {
  logs: AccessLogEntry[];
  onBanIp: (ip: string) => void;
  onBanSession: (sessionId: string) => void;
}

export function CrmAccessLogs({ logs, onBanIp, onBanSession }: CrmAccessLogsProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg bg-white px-4 py-10 text-center text-gray-400 shadow">
        Henüz erişim kaydı yok
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="hidden grid-cols-[1fr_1fr_1fr_0.8fr_1fr_120px] gap-2 border-b bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <span>IP</span>
        <span>Yol</span>
        <span>Oturum</span>
        <span>Durum</span>
        <span>Tarih</span>
        <span />
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="border-b px-4 py-3 text-sm last:border-b-0 md:grid md:grid-cols-[1fr_1fr_1fr_0.8fr_1fr_120px] md:items-center md:gap-2"
        >
          <div className="space-y-2 md:contents">
            <span className="font-mono text-xs text-gray-800">{log.ip}</span>
            <span className="truncate text-gray-700">{log.path}</span>
            <span className="truncate font-mono text-xs text-gray-500">
              {log.sessionId ? `${log.sessionId.slice(0, 8)}…` : "—"}
            </span>
            <span>
              {log.blocked ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  Engellendi
                </span>
              ) : (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  OK
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(log.createdAt).toLocaleString("tr-TR")}
            </span>
            <div className="flex flex-wrap gap-1 md:justify-end">
              <button
                type="button"
                onClick={() => onBanIp(log.ip)}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                IP Ban
              </button>
              {log.sessionId && (
                <button
                  type="button"
                  onClick={() => onBanSession(log.sessionId!)}
                  className="rounded border border-red-600 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Oturum
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
