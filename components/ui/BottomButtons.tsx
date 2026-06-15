export function BottomButtons() {
  return (
    <div className="grid grid-cols-1 gap-0 border-t border-[#e0e0e0] bg-[#f0f0f0] sm:grid-cols-2">
      <button
        type="button"
        className="flex items-center justify-between border-b border-[#e0e0e0] bg-ykb-secondary px-6 py-5 text-left text-white sm:border-b-0 sm:border-r"
      >
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='4' y='2' width='16' height='20' rx='2'/%3E%3Cline x1='8' y1='6' x2='16' y2='6'/%3E%3Cline x1='8' y1='10' x2='10' y2='10'/%3E%3Cline x1='12' y1='10' x2='14' y2='10'/%3E%3Cline x1='8' y1='14' x2='10' y2='14'/%3E%3Cline x1='12' y1='14' x2='14' y2='14'/%3E%3C/svg%3E"
            alt=""
            width={36}
            height={36}
          />
          <span className="text-base font-medium">Kredinizi Hesaplayın</span>
        </div>
        <span className="text-2xl font-light leading-none">&rsaquo;</span>
      </button>
      <button
        type="button"
        className="flex items-center justify-between bg-ykb-secondary px-6 py-5 text-left text-white"
      >
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='5' y='2' width='14' height='20' rx='2'/%3E%3Ccircle cx='12' cy='18' r='1' fill='white'/%3E%3Cpath d='M9 5h6'/%3E%3C/svg%3E"
            alt=""
            width={36}
            height={36}
          />
          <span className="text-base font-medium">
            Dijitalden nasıl kredi alırım?
          </span>
        </div>
        <span className="text-2xl font-light leading-none">&rsaquo;</span>
      </button>
    </div>
  );
}
