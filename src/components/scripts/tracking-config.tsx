import { getScriptSettings, getStoreSettings } from "@/lib/settings";

// Exposes which analytics integrations are active to the browser so the client
// analytics helpers know where to dispatch ecommerce events. Rendered once near
// the top of <body>.
export async function TrackingConfig() {
  const [scripts, store] = await Promise.all([getScriptSettings(), getStoreSettings()]);

  const config = {
    gtm: Boolean(scripts?.gtmEnabled && scripts?.gtmId),
    ga4: Boolean(scripts?.ga4Enabled && scripts?.ga4Id),
    meta: Boolean(scripts?.metaCapiEnabled && scripts?.metaPixelId && scripts?.metaAccessToken),
    metaPixel: Boolean(scripts?.metaPixelEnabled && scripts?.metaPixelId),
    currency: store.currency || "USD",
  };

  return (
    <script
      id="vt-config"
      dangerouslySetInnerHTML={{
        __html: `window.__VT__ = ${JSON.stringify(config)};`,
      }}
    />
  );
}
