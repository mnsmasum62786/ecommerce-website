type EcommerceObject = Record<string, unknown>;

export type TrackItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
};

type DataLayerWindow = typeof window & {
  dataLayer?: Record<string, unknown>[];
};

function pushEcommerceEvent(event: string, ecommerce: EcommerceObject) {
  const dataLayerWindow = window as DataLayerWindow;
  dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
  dataLayerWindow.dataLayer.push({ ecommerce: null });
  dataLayerWindow.dataLayer.push({ event, ecommerce });
}

export function trackViewItem(item: TrackItem) {
  pushEcommerceEvent("view_item", {
    currency: "USD",
    value: item.price * (item.quantity ?? 1),
    items: [item],
  });
}

export function trackAddToCart(item: TrackItem) {
  pushEcommerceEvent("add_to_cart", {
    currency: "USD",
    value: item.price * (item.quantity ?? 1),
    items: [item],
  });
}

export function trackBeginCheckout(items: TrackItem[]) {
  pushEcommerceEvent("begin_checkout", {
    currency: "USD",
    value: items.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0),
    items,
  });
}
