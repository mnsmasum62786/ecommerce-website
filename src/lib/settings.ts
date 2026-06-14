import { prisma } from "@/lib/prisma";
import { cache } from "react";

// Default store settings used when the DB row doesn't yet exist. Keeping these
// here means the storefront renders sensibly even before seeding.
export const DEFAULT_STORE = {
  id: "default",
  storeName: "Verdant Organic Market",
  logoUrl: null as string | null,
  currency: "USD",
  currencySymbol: "$",
  supportEmail: "hello@verdantmarket.com",
  supportPhone: "+1 (555) 010-2345",
  addressLine: "142 Meadowbrook Lane, Portland, OR 97204",
  shippingFlatCents: 599,
  freeShippingThreshold: 7500,
  taxRatePercent: 0,
  facebookUrl: "https://facebook.com",
  instagramUrl: "https://instagram.com",
  twitterUrl: "https://twitter.com",
  announcement: "Free shipping on orders over $75 — fresh, certified-organic groceries delivered to your door.",
};

export type StoreSettingsData = typeof DEFAULT_STORE;

/** Read store settings (cached per request). Falls back to defaults. */
export const getStoreSettings = cache(async (): Promise<StoreSettingsData> => {
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: "default" } });
    if (!row) return DEFAULT_STORE;
    return { ...DEFAULT_STORE, ...row } as StoreSettingsData;
  } catch {
    // DB may be unreachable during build / before migration.
    return DEFAULT_STORE;
  }
});

/** Read the script settings row used by the Custom Script Manager. */
export const getScriptSettings = cache(async () => {
  try {
    return await prisma.scriptSettings.findUnique({ where: { id: "default" } });
  } catch {
    return null;
  }
});
