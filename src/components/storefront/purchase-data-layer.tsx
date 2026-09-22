"use client";

import * as React from "react";

type PurchaseData = {
  transactionId: string;
  value: number;
  tax: number;
  shipping: number;
  coupon: string;
  items: {
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }[];
  billingInfo: {
    full_name: string;
    email: string;
    phone: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

type DataLayerWindow = typeof window & {
  dataLayer?: Record<string, unknown>[];
};

export function PurchaseDataLayer({ purchase }: { purchase: PurchaseData }) {
  React.useEffect(() => {
    const storageKey = `purchase_data_layer_${purchase.transactionId}`;
    if (sessionStorage.getItem(storageKey)) return;

    const dataLayerWindow = window as DataLayerWindow;
    dataLayerWindow.dataLayer = dataLayerWindow.dataLayer ?? [];
    dataLayerWindow.dataLayer.push({ ecommerce: null });
    dataLayerWindow.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: purchase.transactionId,
        value: purchase.value,
        tax: purchase.tax,
        shipping: purchase.shipping,
        currency: "USD",
        coupon: purchase.coupon,
        items: purchase.items,
      },
      billing_info: purchase.billingInfo,
    });
    sessionStorage.setItem(storageKey, "true");
  }, [purchase]);

  return null;
}
