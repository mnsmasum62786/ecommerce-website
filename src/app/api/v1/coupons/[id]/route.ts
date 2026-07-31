import { z } from "zod";
import { DiscountType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { serializeCoupon } from "@/lib/api-serializers";

// ---------------------------------------------------------------------------
// /api/v1/coupons/:id — the identifier may be the coupon id OR its code.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: { id: string } };

/** Resolve a coupon by id, falling back to a (case-insensitive) code lookup. */
async function findCoupon(identifier: string) {
  const byId = await prisma.coupon.findUnique({ where: { id: identifier } });
  if (byId) return byId;
  return prisma.coupon.findUnique({ where: { code: identifier.toUpperCase() } });
}

/**
 * Validate a discount value against its type. Returns an error message, or null
 * when the combination is valid.
 */
function validateValue(type: DiscountType, value: number): string | null {
  if (type === DiscountType.PERCENT && (value < 1 || value > 100)) {
    return "A percentage discount must be between 1 and 100.";
  }
  if (type === DiscountType.FIXED && value <= 0) {
    return "A fixed discount must be greater than 0 cents.";
  }
  return null;
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey<Ctx>("READ", async (_req, { params }) => {
  const coupon = await findCoupon(params.id);
  if (!coupon) return notFound("Coupon");
  return ok(serializeCoupon(coupon));
});

// --- PATCH ------------------------------------------------------------------

const patchSchema = z.object({
  code: z.string().trim().min(3).optional(),
  description: z.string().trim().optional(),
  type: z.nativeEnum(DiscountType).optional(),
  value: z.number().int().optional(),
  minSpendCents: z.number().int().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withApiKey<Ctx>("WRITE", async (req, { params }) => {
  const existing = await findCoupon(params.id);
  if (!existing) return notFound("Coupon");

  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return fail("empty_update", "Provide at least one field to update.", 422);
  }

  // Validate the value against the *effective* type (new type if supplied,
  // otherwise the stored one).
  const effectiveType = data.type ?? existing.type;
  const effectiveValue = data.value ?? existing.value;
  if (data.type !== undefined || data.value !== undefined) {
    const message = validateValue(effectiveType, effectiveValue);
    if (message) {
      return fail("validation_error", "One or more fields are invalid.", 422, [
        { field: "value", message },
      ]);
    }
  }

  const update: Prisma.CouponUpdateInput = {};
  if (data.code !== undefined) {
    const code = data.code.toUpperCase();
    if (code !== existing.code) {
      const clash = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
      if (clash) return fail("code_exists", "A coupon with that code already exists.", 409);
    }
    update.code = code;
  }
  if (data.description !== undefined) update.description = data.description || null;
  if (data.type !== undefined) update.type = data.type;
  if (data.value !== undefined) update.value = data.value;
  if (data.minSpendCents !== undefined) update.minSpendCents = data.minSpendCents;
  if (data.maxUses !== undefined) update.maxUses = data.maxUses;
  if (data.expiresAt !== undefined) {
    update.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }
  if (data.isActive !== undefined) update.isActive = data.isActive;

  const coupon = await prisma.coupon.update({ where: { id: existing.id }, data: update });
  return ok(serializeCoupon(coupon));
});

// --- DELETE -----------------------------------------------------------------

export const DELETE = withApiKey<Ctx>("WRITE", async (_req, { params }) => {
  const existing = await findCoupon(params.id);
  if (!existing) return notFound("Coupon");

  // Coupons carry no financial history of their own, so a hard delete is safe.
  await prisma.coupon.delete({ where: { id: existing.id } });

  return ok({ id: existing.id, deleted: true });
});
