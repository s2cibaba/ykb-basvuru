"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function BlockedScreen({ reason }: { reason?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ykb-page p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl text-red-500">⛔</div>
        <h1 className="mb-2 text-xl font-medium text-ykb-primary">
          Erişim Engellendi
        </h1>
        <p className="text-sm text-gray-600">
          {reason ?? "Bu siteye erişiminiz yönetici tarafından engellenmiştir."}
        </p>
      </div>
    </div>
  );
}

export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/crm")) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    fetch("/api/access/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    })
      .then((res) => res.json())
      .then((data: { banned?: boolean; reason?: string }) => {
        if (cancelled) return;
        if (data.banned) {
          setBlocked(true);
          setBlockReason(data.reason);
        }
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname.startsWith("/crm")) {
    return <>{children}</>;
  }

  if (!checked) {
    return null;
  }

  if (blocked) {
    return <BlockedScreen reason={blockReason} />;
  }

  return <>{children}</>;
}
