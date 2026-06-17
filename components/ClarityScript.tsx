"use client";

import Script from "next/script";

const CLARITY_ID = "x7p4huo8kc";

const META_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

function tagMetaParams() {
  const params = new URLSearchParams(window.location.search);
  for (const key of META_PARAMS) {
    const value = params.get(key);
    if (value && window.clarity) {
      window.clarity("set", key, value);
    }
  }
}

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function ClarityScript() {
  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      onLoad={tagMetaParams}
    >
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");`}
    </Script>
  );
}
