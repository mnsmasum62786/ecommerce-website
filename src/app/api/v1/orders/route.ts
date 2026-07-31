import { z } from "zod";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
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
import { orderInclude, serializeOrder } from "@/lib/api-serializers";
import { validateCoupon } from "@/lib/coupon";
import { getStoreSettings } from "@/lib/settings";
import { computeTotals } from "@/lib/pricing";
import { generateOrderNumber } from "@/lib/utils";
import { dispatchWebhookEvent } from "@/lib/webhooks";

// ---------------------------------------------------------------------------
// /api/v1/orders — list orders and inject new ones from third-party systems.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Parse a comma-separated enum filter, dropping any unrecognised member. */
function enumList<T extends Record<string, string>>(raw: string | null, e: T): T[keyof T][] {
  if (!raw) return [];
  const allowed = new Set(Object.values(e));
  return raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v) => allowed.has(v)) as T[keyof T][];
}

/** Parse an ISO date param; returns undefined when absent or unparseable. */
function isoDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  total_asc: { totalCents: "asc" },
  total_desc: { totalCents: "desc" },
};

// --- GET /api/v1/orders -----------------------------------------------------

export const GET = withApiKey("READ", async (req) => {
  const url = new URL(req.url);
  const pagination = readPagination(url);

  const where: Prisma.OrderWhereInput = {};

  const statuses = enumList(url.searchParams.get("status"), OrderStatus);
  if (statuses.length) where.status = { in: statuses };

  const paymentStatuses = enumList(url.searchParams.get("paymentStatus"), PaymentStatus);
  if (paymentStatuses.length) where.paymentStatus = { in: paymentStatuses };

  const paymentMethods = enumList(url.searchParams.get("paymentMethod"), PaymentMethod);
  if (paymentMethods.length) where.paymentMethod = { in: paymentMethods };

  const email = url.searchParams.get("email")?.trim();
  if (email) where.email = { equals: email, mode: "insensitive" };

  const search = url.searchParams.get("search")?.trim();
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Date window on createdAt.
  const since = isoDate(url.searchParams.get("since"));
  const until = isoDate(url.searchParams.get("until"));
  if (since || until) {
    where.createdAt = { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) };
  }

  const orderBy = SORTS[url.searchParams.get("sort") ?? "newest"] ?? SORTS.newest;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return ok(orders.map(serializeOrder), { meta: paginationMeta(total, pagination) });
});

// --- POST /api/v1/orders ----------------------------------------------------

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "At least one line item is required."),
  customer: z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1),
  }),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1).optional(),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().optional(),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().min(1).default("United States"),
  }),
  paymentMethod: z.enum(["STRIPE", "COD"]).default("COD"),
  paymentStatus: z.enum(["UNPAID", "PAID"]).default("UNPAID"),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  couponCode: z.string().trim().optional(),
  deliveryOption: z.string().trim().default("standard"),
  customerNote: z.string().trim().max(2000).optional(),
  // Third parties that already reserved inventory elsewhere can opt out.
  decrementStock: z.boolean().default(true),
});

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Pricing is ALWAYS derived from the database — client prices are ignored.
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      priceCents: true,
      stock: true,
      isActive: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems: {
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
    imageUrl: string | null;
  }[] = [];

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive) {
      return fail(
        "invalid_product",
        `Product "${item.productId}" does not exist or is not available for sale.`,
        422,
      );
    }
    if (data.decrementStock && product.stock < item.quantity) {
      return fail(
        "insufficient_stock",
        `"${product.name}" has only ${product.stock} in stock.`,
        409,
      );
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity: item.quantity,
      imageUrl: product.images[0]?.url ?? null,
    });
  }

  const subtotalCents = lineItems.reduce((n, i) => n + i.priceCents * i.quantity, 0);

  // Optional coupon.
  let discountCents = 0;
  let appliedCouponCode: string | null = null;
  let couponId: string | null = null;
  if (data.couponCode) {
    const result = await validateCoupon(data.couponCode, subtotalCents);
    if (!result.ok) return fail("invalid_coupon", result.error, 422);
    discountCents = result.discountCents;
    appliedCouponCode = result.code;
    couponId = result.couponId;
  }

  const store = await getStoreSettings();
  const totals = computeTotals(
    { subtotalCents, discountCents, deliveryOption: data.deliveryOption },
    store,
  );

  // Attach the order to an existing account when the email matches one, so the
  // customer sees it in their order history.
  const emailLower = data.customer.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: emailLower },
    select: { id: true },
  });

  const orderNumber = generateOrderNumber();

  // Order + items + stock + coupon usage all move together.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: existingUser?.id ?? null,
        email: emailLower,
        phone: data.customer.phone,
        customerName: data.customer.name,
        shipFullName: data.shippingAddress.fullName || data.customer.name,
        shipLine1: data.shippingAddress.line1,
        shipLine2: data.shippingAddress.line2 || null,
        shipCity: data.shippingAddress.city,
        shipState: data.shippingAddress.state || null,
        shipPostalCode: data.shippingAddress.postalCode,
        shipCountry: data.shippingAddress.country,
        status: data.status,
        paymentStatus: data.paymentStatus as PaymentStatus,
        paymentMethod: data.paymentMethod as PaymentMethod,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
        couponCode: appliedCouponCode,
        deliveryOption: data.deliveryOption,
        customerNote: data.customerNote || null,
        items: {
          create: lineItems.map((i) => ({
            productId: i.productId,
            name: i.name,
            priceCents: i.priceCents,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
        },
      },
      include: orderInclude,
    });

    if (data.decrementStock) {
      for (const i of lineItems) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } },
        });
      }
    }

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }

    return created;
  });

  // Fire-and-forget: webhook problems must never fail order creation.
  try {
    await dispatchWebhookEvent("order.created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: { name: order.customerName, email: order.email, phone: order.phone },
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        priceCents: i.priceCents,
      })),
      totals: {
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        taxCents: order.taxCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
      },
    });
  } catch (err) {
    console.error("[api/v1/orders] webhook dispatch failed:", err);
  }

  return ok(serializeOrder(order), { status: 201 });
});
