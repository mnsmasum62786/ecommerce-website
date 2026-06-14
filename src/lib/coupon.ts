import { prisma } from "@/lib/prisma";

export type CouponResult =
  | { ok: true; code: string; discountCents: number; couponId: string }
  | { ok: false; error: string };

/**
 * Validate a coupon code against a subtotal and compute the discount in cents.
 * Does not mutate usage counts — that happens at order placement.
 */
export async function validateCoupon(rawCode: string, subtotalCents: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { ok: false, error: "Invalid coupon code." };

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (subtotalCents < coupon.minSpendCents) {
    return {
      ok: false,
      error: `Spend at least $${(coupon.minSpendCents / 100).toFixed(2)} to use this coupon.`,
    };
  }

  const discountCents =
    coupon.type === "PERCENT"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : Math.min(coupon.value, subtotalCents);

  return { ok: true, code, discountCents, couponId: coupon.id };
}
