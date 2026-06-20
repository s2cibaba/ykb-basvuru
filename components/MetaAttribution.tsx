"use client";

import { useEffect } from "react";
import Script from "next/script";

const META_COOKIE_MAX_AGE = 7776000; // 90 gün

/** Pixel yüklendiğinde ve CAPI eşleştirmesi için çerezleri saklar */
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

export function MetaAttribution({ pixelId }: { pixelId?: string }) {
  useEffect(() => {
    persistMetaAttributionCookies();
  }, []);

  if (!pixelId) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}
