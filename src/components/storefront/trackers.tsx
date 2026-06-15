"use client";

import { useEffect, useRef } from "react";
import {
  trackViewItem,
  trackViewItemList,
  trackBeginCheckout,
  trackPurchase,
  type TrackItem,
} from "@/lib/analytics";

// Small render-less client components that fire GA4/Meta ecommerce events from
// server-rendered pages. Each guards against double-firing.

export function ViewItemTracker({ item }: { item: TrackItem }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackViewItem(item);
  }, [item]);
  return null;
}

export function ViewItemListTracker({ items, listName }: { items: TrackItem[]; listName?: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    trackViewItemList(items, listName);
  }, [items, listName]);
  return null;
}

export function BeginCheckoutTracker({ items }: { items: TrackItem[] }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    trackBeginCheckout(items);
  }, [items]);
  return null;
}

// Fires the GA4 purchase event once per order (deduped via localStorage so a
// page refresh on the confirmation page doesn't double-count).
export function PurchaseTracker(opts: {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items: TrackItem[];
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    const key = `vt_purchase_${opts.transactionId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* ignore storage errors */
    }
    fired.current = true;
    trackPurchase(opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.transactionId]);
  return null;
}
