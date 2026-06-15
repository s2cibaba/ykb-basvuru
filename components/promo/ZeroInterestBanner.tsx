export function ZeroInterestBanner() {
  return (
    <div className="mx-auto max-w-card px-4 pt-4">
      <div className="flex items-center gap-3 rounded-md border border-ykb-promo-accent/40 bg-ykb-promo px-4 py-2.5">
        <span className="rounded bg-ykb-promo-accent px-2 py-0.5 text-xs font-bold text-white">
          %0 FAİZ
        </span>
        <p className="text-sm font-medium text-[#5a4a00]">
          Yeni müşterilere özel yüzde 0 faizli kredi fırsatı! Hemen başvurun.
        </p>
      </div>
    </div>
  );
}
