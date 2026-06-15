// Client-side analytics dispatch. Builds GA4-schema ecommerce events and routes
// them to the active integrations:
//   - GTM  -> window.dataLayer (GA4 ecommerce schema)
//   - GA4  -> gtag('event', ...) (direct, when GTM is not used)
//   - Meta -> POST /api/track (server-side Conversions API)
//
// Safe to call anywhere on the client; no-ops for integrations that aren't on.

type VTConfig = { gtm: boolean; ga4: boolean; meta: boolean; metaPixel: boolean; currency: string };

type AnyObj = Record<string, unknown>;

declare global {
  interface Window {
    __VT__?: VTConfig;
    dataLayer?: AnyObj[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type TrackItem = {
  item_id: string;
  item_name: string;
  price: number; // major units (e.g. dollars)
  quantity?: number;
  item_category?: string;
};

function cfg(): VTConfig {
  return (
    (typeof window !== "undefined" && window.__VT__) || {
      gtm: false,
      ga4: false,
      meta: false,
      metaPixel: false,
      currency: "USD",
    }
  );
}

function currency(): string {
  return cfg().currency || "USD";
}

/** Random event id used to dedupe browser + server events on Meta's side. */
export function newEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- GA4 (dataLayer + gtag) -------------------------------------------------

function pushDataLayer(event: string, ecommerce: AnyObj) {
  const c = cfg();
  if (!c.gtm && !c.ga4) return;
  window.dataLayer = window.dataLayer || [];
  // Clear the previous ecommerce object first (GA4 recommended pattern).
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
  // When GA4 is configured directly (no GTM), also emit a gtag event.
  if (c.ga4 && !c.gtm && typeof window.gtag === "function") {
    window.gtag("event", event, ecommerce);
  }
}

// --- Meta Conversions API (via our server) ----------------------------------

function metaContents(items: TrackItem[]) {
  return items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, item_price: i.price }));
}

// Fire the browser Meta Pixel with an explicit eventID. Meta deduplicates this
// against the server CAPI event that carries the same event_id + event name.
function fbqTrack(eventName: string, params: AnyObj, eventId: string) {
  if (!cfg().metaPixel || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params, { eventID: eventId });
}

// Send the event to Meta server-side via our /api/track bridge.
async function capiTrack(eventName: string, eventId: string, customData: AnyObj) {
  if (!cfg().meta) return;
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ eventName, eventId, eventSourceUrl: window.location.href, customData }),
    });
  } catch {
    /* tracking must never break the UI */
  }
}

/**
 * Dispatch a Meta event to the browser pixel and/or the server CAPI using a
 * single shared event_id so the two are deduplicated by Meta. Pass `eventId`
 * to pin it (e.g. order number for Purchase); otherwise a random id is used.
 */
function dispatchMeta(eventName: string, customData: AnyObj, eventId: string = newEventId()) {
  const c = cfg();
  if (!c.meta && !c.metaPixel) return;
  fbqTrack(eventName, customData, eventId);
  void capiTrack(eventName, eventId, customData);
}

// --- Public event helpers ---------------------------------------------------

export function trackViewItemList(items: TrackItem[], listName?: string) {
  pushDataLayer("view_item_list", { item_list_name: listName, items });
}

export function trackViewItem(item: TrackItem) {
  const value = item.price * (item.quantity ?? 1);
  pushDataLayer("view_item", { currency: currency(), value, items: [item] });
  dispatchMeta("ViewContent", {
    currency: currency(),
    value,
    content_type: "product",
    content_ids: [item.item_id],
    content_name: item.item_name,
    contents: metaContents([item]),
  });
}

export function trackAddToCart(item: TrackItem) {
  const value = item.price * (item.quantity ?? 1);
  pushDataLayer("add_to_cart", { currency: currency(), value, items: [item] });
  dispatchMeta("AddToCart", {
    currency: currency(),
    value,
    content_type: "product",
    content_ids: [item.item_id],
    content_name: item.item_name,
    contents: metaContents([item]),
  });
}

export function trackBeginCheckout(items: TrackItem[]) {
  const value = items.reduce((n, i) => n + i.price * (i.quantity ?? 1), 0);
  pushDataLayer("begin_checkout", { currency: currency(), value, items });
  dispatchMeta("InitiateCheckout", {
    currency: currency(),
    value,
    content_type: "product",
    content_ids: items.map((i) => i.item_id),
    contents: metaContents(items),
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
  });
}

/**
 * GA4 purchase (client) + Meta Purchase via the browser pixel. The server also
 * sends a Meta Purchase from the checkout API with the same event_id (the order
 * number), so Meta deduplicates the browser and server copies.
 */
export function trackPurchase(opts: {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items: TrackItem[];
}) {
  pushDataLayer("purchase", {
    transaction_id: opts.transactionId,
    currency: currency(),
    value: opts.value,
    tax: opts.tax,
    shipping: opts.shipping,
    coupon: opts.coupon,
    items: opts.items,
  });
  // Browser-side Meta Purchase, pinned to the order number so it dedupes with
  // the server CAPI Purchase. Only fires when the browser pixel is enabled.
  fbqTrack(
    "Purchase",
    {
      currency: currency(),
      value: opts.value,
      content_type: "product",
      content_ids: opts.items.map((i) => i.item_id),
      contents: metaContents(opts.items),
      num_items: opts.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    },
    opts.transactionId,
  );
}
