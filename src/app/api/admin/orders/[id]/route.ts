import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    refundFlag: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Order not found.", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid order update.", 400);
  }
  const data = parsed.data;

  const updateData: Prisma.OrderUpdateInput = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.refundFlag !== undefined) updateData.refundFlag = data.refundFlag;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  // Marking refunded is a convenience that also flips the payment status.
  if (data.refundFlag === true && data.paymentStatus === undefined) {
    updateData.paymentStatus = PaymentStatus.REFUNDED;
  }

  const statusChanged = data.status !== undefined && data.status !== existing.status;

  let order;
  try {
    order = await prisma.order.update({
      where: { id: existing.id },
      data: updateData,
      include: { items: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order.";
    return apiError(message, 500);
  }

  if (statusChanged) {
    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: {
        name: order.customerName,
        email: order.email,
        phone: order.phone,
      },
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        priceCents: item.priceCents,
      })),
      totals: {
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        taxCents: order.taxCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
      },
    };

    try {
      await dispatchWebhookEvent("order.status_changed", payload);
      if (order.status === OrderStatus.CANCELLED) {
        await dispatchWebhookEvent("order.cancelled", payload);
      }
    } catch (err) {
      // Webhook problems must never fail the admin action.
      console.error("[orders] Webhook dispatch failed:", err);
    }
  }

  return NextResponse.json({ order });
}
