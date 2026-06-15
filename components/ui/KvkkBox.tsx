import { KVKK_TEXT } from "@/lib/content";

export function KvkkBox() {
  const parts = KVKK_TEXT.split(/(aydınlatma metnimizde|aydınlatma metnimizden)/);

  return (
    <div className="mx-auto mt-6 flex w-full max-w-[450px] gap-2">
      <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ykb-primary text-[11px] font-bold italic text-white">
        i
      </div>
      <p className="text-[13px] leading-[1.6] text-[#1F1F1F]">
        {parts.map((part, i) =>
          part === "aydınlatma metnimizde" ||
          part === "aydınlatma metnimizden" ? (
            <a key={i} href="#" className="ykb-link text-[13px]">
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    </div>
  );
}
