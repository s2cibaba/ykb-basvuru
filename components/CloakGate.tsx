"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ClarityScript } from "@/components/ClarityScript";
import { MetaAttribution } from "@/components/MetaAttribution";

export function CloakGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skip = pathname.startsWith("/crm") || pathname.startsWith("/subeler");
  const [isOffer, setIsOffer] = useState(skip);

  useEffect(() => {
    if (skip) return;

    fetch("/api/cloak/check", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { page?: string }) => {
        setIsOffer(data.page !== "white");
      })
      .catch(() => setIsOffer(true));
  }, [skip]);

  return (
    <>
      {isOffer && !skip && (
        <>
          <ClarityScript />
          <MetaAttribution />
        </>
      )}
      {children}
    </>
  );
}
