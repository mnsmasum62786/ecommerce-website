import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { DEFAULT_STORE } from "@/lib/settings";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required."),
  logoUrl: z.string().trim().optional().nullable(),
  currency: z.string().trim().min(1, "Currency is required."),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required."),
  supportEmail: z.string().trim().email("A valid support email is required."),
  supportPhone: z.string().trim().optional().nullable(),
  addressLine: z.string().trim().optional().nullable(),
  shippingFlatCents: z.coerce.number().int().min(0),
  freeShippingThreshold: z.coerce.number().int().min(0),
  taxRatePercent: z.coerce.number().min(0).max(100),
  facebookUrl: z.string().trim().optional().nullable(),
  instagramUrl: z.string().trim().optional().nullable(),
  twitterUrl: z.string().trim().optional().nullable(),
  announcement: z.string().trim().optional().nullable(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings: settings ?? DEFAULT_STORE });
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid settings data.", 400);
  }
  const d = parsed.data;

  const data = {
    storeName: d.storeName,
    logoUrl: d.logoUrl?.trim() || null,
    currency: d.currency,
    currencySymbol: d.currencySymbol,
    supportEmail: d.supportEmail,
    supportPhone: d.supportPhone?.trim() || null,
    addressLine: d.addressLine?.trim() || null,
    shippingFlatCents: d.shippingFlatCents,
    freeShippingThreshold: d.freeShippingThreshold,
    taxRatePercent: d.taxRatePercent,
    facebookUrl: d.facebookUrl?.trim() || null,
    instagramUrl: d.instagramUrl?.trim() || null,
    twitterUrl: d.twitterUrl?.trim() || null,
    announcement: d.announcement?.trim() || null,
  };

  const settings = await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return NextResponse.json({ settings });
}
