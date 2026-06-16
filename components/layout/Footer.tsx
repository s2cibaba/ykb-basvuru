import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-ykb-footer">
      <div className="mx-auto flex max-w-card flex-col items-start gap-1 px-[10px] py-[18px] text-[11px] text-white sm:flex-row sm:items-center sm:justify-between sm:text-xs">
        <span>©2026 Yapı ve Kredi Bankası A.Ş.</span>
        <Link href="#" className="text-white hover:underline">
          İletişim
        </Link>
      </div>
    </footer>
  );
}
