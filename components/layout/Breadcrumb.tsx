import Link from "next/link";

export function Breadcrumb() {
  return (
    <nav className="mb-2 text-xs leading-normal text-[#60646C]">
      <Link href="#" className="text-[#60646C] hover:text-ykb-primary">
        Yapı Kredi
      </Link>
      <span className="mx-1">&gt;</span>
      <Link href="#" className="text-[#60646C] hover:text-ykb-primary">
        Başvuru Merkezi
      </Link>
      <span className="mx-1">&gt;</span>
      <span className="text-[#60646C]">Bireysel İhtiyaç Kredisi</span>
    </nav>
  );
}
