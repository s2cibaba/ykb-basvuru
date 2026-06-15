import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-ykb-footer">
      <div className="mx-auto flex max-w-card items-center justify-between px-[10px] py-[18px] text-xs text-white">
        <span>©2026 Yapı ve Kredi Bankası A.Ş.</span>
        <Link href="#" className="text-white hover:underline">
          İletişim
        </Link>
      </div>
    </footer>
  );
}
