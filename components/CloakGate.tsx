"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ClarityScript } from "@/components/ClarityScript";
import { MetaAttribution } from "@/components/MetaAttribution";

export function CloakGate({
  children,
  initialOffer = true,
}: {
  children: React.ReactNode;
  initialOffer?: boolean;
}) {
  const pathname = usePathname();
  const skip = pathname.startsWith("/crm") || pathname.startsWith("/subeler");
  const [isOffer, setIsOffer] = useState(skip || initialOffer);

  useEffect(() => {
    if (skip || initialOffer) return;

    fetch("/api/cloak/check", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { page?: string }) => {
        setIsOffer(data.page !== "white");
      })
      .catch(() => setIsOffer(true));
  }, [skip, initialOffer]);

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
