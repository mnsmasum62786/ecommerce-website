import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, DiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  code: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  type: z.nativeEnum(DiscountType).optional(),
  value: z.coerce.number().int().min(0).optional(),
  minSpendCents: z.coerce.number().int().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid coupon data.", 400);
  }
  const d = parsed.data;

  const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Coupon not found.", 404);

  const effectiveType = d.type ?? existing.type;
  const effectiveValue = d.value ?? existing.value;
  if (effectiveType === DiscountType.PERCENT && effectiveValue > 100) {
    return apiError("Percentage discounts cannot exceed 100%.", 400);
  }

  const data: Prisma.CouponUpdateInput = {};
  if (d.code !== undefined) data.code = d.code.toUpperCase();
  if (d.description !== undefined) data.description = d.description?.trim() || null;
  if (d.type !== undefined) data.type = d.type;
  if (d.value !== undefined) data.value = d.value;
  if (d.minSpendCents !== undefined) data.minSpendCents = d.minSpendCents;
  if (d.maxUses !== undefined) data.maxUses = d.maxUses ?? null;
  if (d.expiresAt !== undefined) data.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.isActive !== undefined) data.isActive = d.isActive;

  try {
    const coupon = await prisma.coupon.update({ where: { id: params.id }, data });
    return NextResponse.json({ coupon });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return apiError("A coupon with that code already exists.", 409);
      if (err.code === "P2025") return apiError("Coupon not found.", 404);
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await prisma.coupon.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return apiError("Coupon not found.", 404);
    }
    throw err;
  }
}
