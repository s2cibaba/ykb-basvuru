"use client";

import { useEffect } from "react";

/** Pixel yok — sadece fbclid'den _fbc cookie (CAPI attribution). */
function persistFbcFromFbclid() {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid || document.cookie.includes("_fbc=")) return;
  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; SameSite=Lax`;
}

export function MetaAttribution() {
  useEffect(() => {
    persistFbcFromFbclid();
  }, []);
  return null;
}
