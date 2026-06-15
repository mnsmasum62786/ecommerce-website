import type { StoreSettingsData } from "@/lib/settings";

export type PricingInput = {
  subtotalCents: number;
  discountCents: number;
  deliveryOption?: string;
};

export type PricingResult = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

// Delivery option surcharges (added on top of base shipping), in cents.
export const DELIVERY_OPTIONS: Record<string, { label: string; surchargeCents: number; eta: string }> = {
  standard: { label: "Standard (3–5 days)", surchargeCents: 0, eta: "3–5 business days" },
  express: { label: "Express (1–2 days)", surchargeCents: 700, eta: "1–2 business days" },
};

/**
 * Compute order totals from a subtotal, discount, store shipping rules, and
 * delivery option. Free shipping applies once the post-discount subtotal meets
 * the threshold (express surcharge still applies).
 */
export function computeTotals(input: PricingInput, store: StoreSettingsData): PricingResult {
  const { subtotalCents } = input;
  const discountCents = Math.min(input.discountCents, subtotalCents);
  const netSubtotal = subtotalCents - discountCents;

  const delivery = DELIVERY_OPTIONS[input.deliveryOption ?? "standard"] ?? DELIVERY_OPTIONS.standard;

  let baseShipping = store.shippingFlatCents;
  if (netSubtotal >= store.freeShippingThreshold) baseShipping = 0;
  const shippingCents = baseShipping + delivery.surchargeCents;

  const taxCents = Math.round((netSubtotal * store.taxRatePercent) / 100);
  const totalCents = netSubtotal + shippingCents + taxCents;

  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents };
}
