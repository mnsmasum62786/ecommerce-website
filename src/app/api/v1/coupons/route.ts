import { z } from "zod";
import { DiscountType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ok,
  fail,
  preflight,
  withApiKey,
  readPagination,
  paginationMeta,
  parseBody,
} from "@/lib/api-v1";
import { serializeCoupon } from "@/lib/api-serializers";

// ---------------------------------------------------------------------------
// /api/v1/coupons — list and create discount codes.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const SORTS: Record<string, Prisma.CouponOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  code_asc: { code: "asc" },
  usage_desc: { usedCount: "desc" },
};

// --- GET /api/v1/coupons ----------------------------------------------------

export const GET = withApiKey("READ", async (req) => {
  const url = new URL(req.url);
  const pagination = readPagination(url);

  const where: Prisma.CouponWhereInput = {};

  const active = url.searchParams.get("active");
  if (active === "true") where.isActive = true;
  else if (active === "false") where.isActive = false;

  const search = url.searchParams.get("search")?.trim();
  if (search) where.code = { contains: search, mode: "insensitive" };

  const orderBy = SORTS[url.searchParams.get("sort") ?? "newest"] ?? SORTS.newest;

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.coupon.count({ where }),
  ]);

  return ok(coupons.map(serializeCoupon), { meta: paginationMeta(total, pagination) });
});

// --- POST /api/v1/coupons ---------------------------------------------------

const createSchema = z
  .object({
    code: z.string().trim().min(3),
    description: z.string().trim().optional(),
    type: z.nativeEnum(DiscountType).default(DiscountType.PERCENT),
    // PERCENT -> percentage points (1-100); FIXED -> discount amount in cents.
    value: z.number().int(),
    minSpendCents: z.number().int().min(0).default(0),
    maxUses: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === DiscountType.PERCENT && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "A percentage discount must be between 1 and 100.",
      });
    }
    if (data.type === DiscountType.FIXED && data.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "A fixed discount must be greater than 0 cents.",
      });
    }
  });

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const code = data.code.toUpperCase();

  const existing = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
  if (existing) return fail("code_exists", "A coupon with that code already exists.", 409);

  const coupon = await prisma.coupon.create({
    data: {
      code,
      description: data.description || null,
      type: data.type,
      value: data.value,
      minSpendCents: data.minSpendCents,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
    },
  });

  return ok(serializeCoupon(coupon), { status: 201 });
});
