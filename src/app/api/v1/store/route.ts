import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { getStoreSettings, DEFAULT_STORE, type StoreSettingsData } from "@/lib/settings";
import { DELIVERY_OPTIONS } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// /api/v1/store — public store configuration (currency, shipping rules, tax,
// support contacts). Third-party checkouts use this to mirror our pricing.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const money = (c: number) => ({ cents: c, amount: (c / 100).toFixed(2) });

/** The single public representation of store settings, shared by GET and PATCH. */
function serializeStore(store: StoreSettingsData) {
  return {
    storeName: store.storeName,
    currency: store.currency,
    currencySymbol: store.currencySymbol,
    supportEmail: store.supportEmail,
    supportPhone: store.supportPhone,
    addressLine: store.addressLine,
    shipping: {
      flatRate: money(store.shippingFlatCents),
      freeShippingThreshold: money(store.freeShippingThreshold),
      options: Object.entries(DELIVERY_OPTIONS).map(([id, option]) => ({
        id,
        label: option.label,
        surcharge: money(option.surchargeCents),
        eta: option.eta,
      })),
    },
    taxRatePercent: store.taxRatePercent,
    social: {
      facebook: store.facebookUrl,
      instagram: store.instagramUrl,
      twitter: store.twitterUrl,
    },
  };
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey("READ", async () => {
  const store = await getStoreSettings();
  return ok(serializeStore(store));
});

// --- PATCH ------------------------------------------------------------------

/** A URL, or an empty string meaning "clear this field". */
const urlOrEmpty = z.union([z.string().trim().url(), z.literal("")]);

const patchSchema = z.object({
  storeName: z.string().trim().min(1).optional(),
  currency: z.string().trim().min(1).optional(),
  currencySymbol: z.string().trim().min(1).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().min(1).optional(),
  addressLine: z.string().trim().optional(),
  shippingFlatCents: z.number().int().min(0).optional(),
  freeShippingThreshold: z.number().int().min(0).optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  facebookUrl: urlOrEmpty.optional(),
  instagramUrl: urlOrEmpty.optional(),
  twitterUrl: urlOrEmpty.optional(),
  announcement: z.string().trim().optional(),
});

export const PATCH = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return fail("empty_update", "Provide at least one field to update.", 422);
  }

  // Assignable to both the update and create halves of the upsert below.
  const update: Prisma.StoreSettingsUpdateInput & Prisma.StoreSettingsCreateInput = {};
  if (data.storeName !== undefined) update.storeName = data.storeName;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.currencySymbol !== undefined) update.currencySymbol = data.currencySymbol;
  if (data.supportEmail !== undefined) update.supportEmail = data.supportEmail;
  if (data.supportPhone !== undefined) update.supportPhone = data.supportPhone;
  if (data.addressLine !== undefined) update.addressLine = data.addressLine || null;
  if (data.shippingFlatCents !== undefined) update.shippingFlatCents = data.shippingFlatCents;
  if (data.freeShippingThreshold !== undefined) {
    update.freeShippingThreshold = data.freeShippingThreshold;
  }
  if (data.taxRatePercent !== undefined) update.taxRatePercent = data.taxRatePercent;
  // Empty string clears the link.
  if (data.facebookUrl !== undefined) update.facebookUrl = data.facebookUrl || null;
  if (data.instagramUrl !== undefined) update.instagramUrl = data.instagramUrl || null;
  if (data.twitterUrl !== undefined) update.twitterUrl = data.twitterUrl || null;
  if (data.announcement !== undefined) update.announcement = data.announcement || null;

  // Single-row table: create it on first write, update it thereafter.
  const row = await prisma.storeSettings.upsert({
    where: { id: "default" },
    update,
    create: { ...update, id: "default" },
  });

  // Merge over the defaults so the response shape is always complete, and so
  // it matches GET exactly (getStoreSettings is request-cached and would
  // otherwise return the pre-update snapshot).
  return ok(serializeStore({ ...DEFAULT_STORE, ...row } as StoreSettingsData));
});
