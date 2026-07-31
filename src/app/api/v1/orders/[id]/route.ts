import { z } from "zod";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { orderInclude, serializeOrder } from "@/lib/api-serializers";
import { dispatchWebhookEvent, type WebhookEvent } from "@/lib/webhooks";

// ---------------------------------------------------------------------------
// /api/v1/orders/:id — the identifier may be the internal id OR the
// human-facing order number (e.g. "VRD-20260731-A1B2C3").
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: { id: string } };

type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Look an order up by id, falling back to its order number. */
async function findOrder(identifier: string): Promise<FullOrder | null> {
  const byId = await prisma.order.findUnique({
    where: { id: identifier },
    include: orderInclude,
  });
  if (byId) return byId;
  return prisma.order.findUnique({
    where: { orderNumber: identifier },
    include: orderInclude,
  });
}

/** Build the exact OrderPayload shape consumed by src/lib/webhooks.ts. */
function webhookPayload(order: FullOrder) {
  return {
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
  };
}

/** Dispatch a list of events, swallowing any failure. */
async function dispatchAll(events: WebhookEvent[], order: FullOrder) {
  if (!events.length) return;
  try {
    const payload = webhookPayload(order);
    for (const event of events) {
      await dispatchWebhookEvent(event, payload);
    }
  } catch (err) {
    console.error("[api/v1/orders/:id] webhook dispatch failed:", err);
  }
}

/**
 * Apply an order update, restoring inventory when the order transitions into
 * CANCELLED for the first time. Both happen in one transaction.
 */
async function updateOrder(
  existing: FullOrder,
  data: Prisma.OrderUpdateInput,
  restoreStock: boolean,
): Promise<FullOrder> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: existing.id },
      data,
      include: orderInclude,
    });

    if (restoreStock) {
      for (const item of existing.items) {
        if (!item.productId) continue; // Product was deleted — nothing to restore.
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return updated;
  });
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey<Ctx>("READ", async (_req, { params }) => {
  const order = await findOrder(params.id);
  if (!order) return notFound("Order");
  return ok(serializeOrder(order));
});

// --- PATCH ------------------------------------------------------------------

const patchSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  refundFlag: z.boolean().optional(),
  customerNote: z.string().trim().max(2000).optional(),
  shippingAddress: z
    .object({
      fullName: z.string().trim().min(1).optional(),
      line1: z.string().trim().min(1).optional(),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(1).optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().min(1).optional(),
      country: z.string().trim().min(1).optional(),
    })
    .optional(),
});

export const PATCH = withApiKey<Ctx>("WRITE", async (req, { params }) => {
  const existing = await findOrder(params.id);
  if (!existing) return notFound("Order");

  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return fail("empty_update", "Provide at least one field to update.", 422);
  }

  const update: Prisma.OrderUpdateInput = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.paymentStatus !== undefined) update.paymentStatus = data.paymentStatus;
  if (data.refundFlag !== undefined) update.refundFlag = data.refundFlag;
  if (data.customerNote !== undefined) update.customerNote = data.customerNote || null;

  const addr = data.shippingAddress;
  if (addr) {
    if (addr.fullName !== undefined) update.shipFullName = addr.fullName;
    if (addr.line1 !== undefined) update.shipLine1 = addr.line1;
    if (addr.line2 !== undefined) update.shipLine2 = addr.line2 || null;
    if (addr.city !== undefined) update.shipCity = addr.city;
    if (addr.state !== undefined) update.shipState = addr.state || null;
    if (addr.postalCode !== undefined) update.shipPostalCode = addr.postalCode;
    if (addr.country !== undefined) update.shipCountry = addr.country;
  }

  const statusChanged = data.status !== undefined && data.status !== existing.status;
  const becomingCancelled =
    statusChanged &&
    data.status === OrderStatus.CANCELLED &&
    existing.status !== OrderStatus.CANCELLED;
  const becamePaid =
    data.paymentStatus === PaymentStatus.PAID && existing.paymentStatus !== PaymentStatus.PAID;

  const order = await updateOrder(existing, update, becomingCancelled);

  const events: WebhookEvent[] = [];
  if (statusChanged) events.push("order.status_changed");
  if (becomingCancelled) events.push("order.cancelled");
  if (becamePaid) events.push("order.paid");
  await dispatchAll(events, order);

  return ok(serializeOrder(order));
});

// --- DELETE (soft: cancel) --------------------------------------------------

export const DELETE = withApiKey<Ctx>("WRITE", async (_req, { params }) => {
  const existing = await findOrder(params.id);
  if (!existing) return notFound("Order");

  // Orders are financial records — cancel rather than destroy.
  if (existing.status === OrderStatus.CANCELLED) {
    return ok({
      id: existing.id,
      orderNumber: existing.orderNumber,
      status: OrderStatus.CANCELLED,
      cancelled: true,
    });
  }

  const order = await updateOrder(existing, { status: OrderStatus.CANCELLED }, true);
  await dispatchAll(["order.status_changed", "order.cancelled"], order);

  return ok({
    id: order.id,
    orderNumber: order.orderNumber,
    status: OrderStatus.CANCELLED,
    cancelled: true,
  });
});
