"use client";

import { useState } from "react";
import { FAQ_CONTENT } from "@/lib/content";

export function FaqAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-[#e0e0e0] bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-[30px] py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ykb-primary text-sm font-bold text-ykb-primary">
            ?
          </span>
          <span className="text-base font-medium text-ykb-primary">
            Bireysel kredi ile ilgili merak ettikleriniz
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#004990"
          strokeWidth="2"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-5 border-t border-[#e0e0e0] px-[30px] py-5 text-[14px] leading-[1.7] text-[#1F1F1F]">
          {FAQ_CONTENT.map((item, i) => (
            <div key={i}>
              {item.title && (
                <h4 className="mb-2 text-[15px] font-medium text-ykb-primary">
                  {item.title}
                </h4>
              )}
              {item.body && (
                <p className="whitespace-pre-line text-[#1F1F1F]">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
