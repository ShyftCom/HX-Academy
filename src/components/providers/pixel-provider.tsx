"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type PixelConfig = {
  platform: string;
  pixelId: string;
  isActive: boolean;
  useConversionApi: boolean;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    ttq?: { load: (id: string) => void; page: () => void };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function injectFacebookPixel(pixelId: string) {
  if (window.fbq) {
    window.fbq("track", "PageView");
    return;
  }
  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','${pixelId}');fbq('track','PageView');
  `;
  document.head.appendChild(script);
  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.head.appendChild(noscript);
}

function injectTikTokPixel(pixelId: string) {
  if (window.ttq) {
    window.ttq.page();
    return;
  }
  const script = document.createElement("script");
  script.innerHTML = `
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=
    ["page","track","identify","instances","debug","on","off","once","ready","alias",
    "group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){
    t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;
    i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){
    for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);
    return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
    ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";
    o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];
    a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page();}(window,document,'ttq');
  `;
  document.head.appendChild(script);
}

function injectGoogleTag(measurementId: string) {
  if (window.gtag) {
    window.gtag("config", measurementId);
    return;
  }
  const scriptSrc = document.createElement("script");
  scriptSrc.async = true;
  scriptSrc.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(scriptSrc);

  const scriptInit = document.createElement("script");
  scriptInit.innerHTML = `
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','${measurementId}');
  `;
  document.head.appendChild(scriptInit);
}

export function PixelProvider() {
  const { data: session } = useSession();
  const stationId = (session?.user as any)?.stationId;
  const pathname = usePathname();
  const injected = useRef(false);

  useEffect(() => {
    if (!stationId || injected.current) return;

    fetch(`/api/pixels/${stationId}`)
      .then((r) => r.json())
      .then((configs: PixelConfig[]) => {
        const active = configs.filter((c) => c.isActive && c.pixelId);
        for (const config of active) {
          if (config.platform === "facebook") injectFacebookPixel(config.pixelId);
          if (config.platform === "tiktok") injectTikTokPixel(config.pixelId);
          if (config.platform === "google") injectGoogleTag(config.pixelId);
        }
        injected.current = true;
      })
      .catch(() => {});
  }, [stationId]);

  useEffect(() => {
    if (!injected.current) return;
    if (window.fbq) window.fbq("track", "PageView");
    if (window.ttq) window.ttq.page();
    if (window.gtag) {
      const configs = (window as any).__pixelMeasurementIds as string[] | undefined;
      if (configs) configs.forEach((id) => window.gtag!("config", id, { page_path: pathname }));
    }
  }, [pathname]);

  return null;
}
