"use client";

import Script from "next/script";

const CLARITY_ID = "x7p4huo8kc";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Clarity inline snippet — tag'leri kuyruğa anında push eder,
 * clarity.ms yüklendiğinde kuyruk işlenir.
 */
function claritySnippet() {
  return `(function(c,l,a,r,i,t,y,q,p){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    p=new URLSearchParams(c.location.search);
    q=["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid"];
    for(var k=0;k<q.length;k++){var v=p.get(q[k]);if(v)c[a]("set",q[k],v);}
  })(window, document, "clarity", "script", "${CLARITY_ID}");`;
}

export function ClarityScript() {
  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
    >
      {claritySnippet()}
    </Script>
  );
}
