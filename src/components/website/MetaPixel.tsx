import { getSettings } from "@/lib/settings";

/** Meta pixel IDs are numeric only. Guards the inline script below, which
 *  interpolates this value directly into raw HTML. */
const PIXEL_ID_RE = /^\d+$/;

/** Sitewide Meta (Facebook) Pixel, mounted once in the locale layout so every
 *  public page loads it. Configured from Settings > Meta Pixel (Super Admin);
 *  the "Lead" event itself is fired client-side from the apply flow. */
export async function MetaPixel() {
  let s: Record<string, string> = {};
  try {
    s = await getSettings(["meta_pixel_enabled", "meta_pixel_id"]);
  } catch {
    return null;
  }

  const pixelId = (s.meta_pixel_id ?? "").trim();
  if (s.meta_pixel_enabled !== "true" || !PIXEL_ID_RE.test(pixelId)) return null;

  return (
    <>
      <script
        id="meta-pixel"
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
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
