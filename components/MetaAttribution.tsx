"use client";

import { useEffect } from "react";

const META_COOKIE_MAX_AGE = 7776000; // 90 gün

/** Pixel yok — _fbc (fbclid) ve _fbp (browser id) CAPI eşleştirmesi için. */
function persistMetaAttributionCookies() {
  if (!document.cookie.includes("_fbp=")) {
    const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
    document.cookie = `_fbp=${fbp}; path=/; max-age=${META_COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid && !document.cookie.includes("_fbc=")) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${fbc}; path=/; max-age=${META_COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function MetaAttribution() {
  useEffect(() => {
    persistMetaAttributionCookies();
  }, []);
  return null;
}
