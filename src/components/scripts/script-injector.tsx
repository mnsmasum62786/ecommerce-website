import { getScriptSettings } from "@/lib/settings";

// Server component that renders site-wide tracking/custom scripts based on the
// settings configured in the admin Custom Script Manager. Rendered inside the
// <head>, immediately after <body>, and in the footer respectively.
//
// SECURITY NOTE: These scripts are authored by trusted store admins via the
// admin panel (protected by auth + role checks). We intentionally inject raw
// HTML so admins can paste vendor snippets (GTM, Meta Pixel, etc.) without code
// changes — this is the explicit purpose of the feature.

type Slot = "head" | "bodyStart" | "footer";

export async function ScriptInjector({ slot }: { slot: Slot }) {
  const s = await getScriptSettings();
  if (!s) return null;

  const blocks: string[] = [];

  if (slot === "head") {
    if (s.gtmEnabled && s.gtmId) {
      blocks.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${s.gtmId}');</script>
<!-- End Google Tag Manager -->`);
    }
    if (s.ga4Enabled && s.ga4Id) {
      blocks.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${s.ga4Id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.ga4Id}');</script>`);
    }
    if (s.metaPixelEnabled && s.metaPixelId) {
      blocks.push(`<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.metaPixelId}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${s.metaPixelId}&ev=PageView&noscript=1"/></noscript>`);
    }
    if (s.tiktokEnabled && s.tiktokPixelId) {
      blocks.push(`<!-- TikTok Pixel -->
<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${s.tiktokPixelId}');ttq.page();}(window,document,'ttq');</script>`);
    }
    if (s.headEnabled && s.headScripts) blocks.push(s.headScripts);
  }

  if (slot === "bodyStart") {
    if (s.gtmEnabled && s.gtmId) {
      blocks.push(`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${s.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
    }
    if (s.bodyStartEnabled && s.bodyStartScripts) blocks.push(s.bodyStartScripts);
  }

  if (slot === "footer") {
    if (s.footerEnabled && s.footerScripts) blocks.push(s.footerScripts);
  }

  if (blocks.length === 0) return null;

  return <div dangerouslySetInnerHTML={{ __html: blocks.join("\n") }} suppressHydrationWarning />;
}
