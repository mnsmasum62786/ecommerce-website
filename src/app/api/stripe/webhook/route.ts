import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // No-op if Stripe isn't configured (COD-only deployments).
  if (!stripe || !secret) {
    return NextResponse.json({ received: true });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const orderId = checkoutSession.metadata?.orderId;

    const order =
      (orderId
        ? await prisma.order.findUnique({ where: { id: orderId } })
        : null) ??
      (await prisma.order.findFirst({ where: { stripeSessionId: checkoutSession.id } }));

    if (order && order.paymentStatus !== "PAID") {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "PROCESSING",
          stripePaymentId:
            typeof checkoutSession.payment_intent === "string"
              ? checkoutSession.payment_intent
              : checkoutSession.payment_intent?.id ?? null,
        },
        include: { items: true },
      });

      const payload = {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        customer: {
          name: updated.customerName,
          email: updated.email,
          phone: updated.phone,
        },
        items: updated.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          priceCents: i.priceCents,
        })),
        totals: {
          subtotalCents: updated.subtotalCents,
          shippingCents: updated.shippingCents,
          taxCents: updated.taxCents,
          discountCents: updated.discountCents,
          totalCents: updated.totalCents,
        },
      };

      try {
        await dispatchWebhookEvent("order.paid", payload);
        await dispatchWebhookEvent("order.status_changed", payload);
      } catch (err) {
        console.error("[stripe/webhook] event dispatch failed:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
