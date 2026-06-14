import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, DiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const couponSchema = z.object({
  code: z.string().trim().min(1, "Code is required."),
  description: z.string().trim().optional().nullable(),
  type: z.nativeEnum(DiscountType),
  // For PERCENT: 0-100. For FIXED: amount in cents.
  value: z.coerce.number().int().min(0, "Value must be positive."),
  minSpendCents: z.coerce.number().int().min(0).default(0),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid coupon data.", 400);
  }
  const d = parsed.data;

  if (d.type === DiscountType.PERCENT && d.value > 100) {
    return apiError("Percentage discounts cannot exceed 100%.", 400);
  }

  const code = d.code.toUpperCase();

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: d.description?.trim() || null,
        type: d.type,
        value: d.value,
        minSpendCents: d.minSpendCents,
        maxUses: d.maxUses ?? null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        isActive: d.isActive,
      },
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiError("A coupon with that code already exists.", 409);
    }
    throw err;
  }
}
