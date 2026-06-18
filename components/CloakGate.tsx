"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ClarityScript } from "@/components/ClarityScript";
import { MetaAttribution } from "@/components/MetaAttribution";

export function CloakGate({
  children,
  initialIsOffer = false,
}: {
  children: React.ReactNode;
  initialIsOffer?: boolean;
}) {
  const pathname = usePathname();
  const skip = pathname.startsWith("/crm") || pathname.startsWith("/subeler");

  useEffect(() => {
    if (!skip && !initialIsOffer) {
      window.location.replace("/subeler.html");
    }
  }, [skip, initialIsOffer]);

  if (skip) {
    return <>{children}</>;
  }

  if (!initialIsOffer) {
    return null;
  }

  return (
    <>
      <ClarityScript />
      <MetaAttribution />
      {children}
    </>
  );
}
