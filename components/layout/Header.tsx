import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-ykb-page">
      <div className="mx-auto max-w-card px-[10px] py-5">
        <Link href="/" className="inline-block">
          <Image
            src="/assets/ykb-logo.svg"
            alt="Yapı ve Kredi Bankası"
            width={180}
            height={30}
            priority
          />
        </Link>
      </div>
    </header>
  );
}
