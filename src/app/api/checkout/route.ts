import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";
import { getStoreSettings } from "@/lib/settings";
import { computeTotals } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { generateOrderNumber } from "@/lib/utils";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Your cart is empty."),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  shipping: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional().default(""),
    city: z.string().trim().min(1),
    state: z.string().trim().optional().default(""),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().min(1).default("United States"),
  }),
  deliveryOption: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["STRIPE", "COD"]),
  couponCode: z.string().trim().optional(),
  customerNote: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Load products from DB and validate availability. Prices come from the DB.
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
      return NextResponse.json(
        { error: `A product in your cart is no longer available.` },
        { status: 400 },
      );
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `"${product.name}" is out of stock or has insufficient quantity.` },
        { status: 400 },
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

  // Coupon validation.
  let discountCents = 0;
  let appliedCouponCode: string | null = null;
  let couponId: string | null = null;
  if (data.couponCode && data.couponCode.trim()) {
    const result = await validateCoupon(data.couponCode, subtotalCents);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    discountCents = result.discountCents;
    appliedCouponCode = result.code;
    couponId = result.couponId;
  }

  const store = await getStoreSettings();
  const totals = computeTotals(
    { subtotalCents, discountCents, deliveryOption: data.deliveryOption },
    store,
  );

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const orderNumber = generateOrderNumber();

  // Create the order, items, decrement stock and bump coupon usage atomically.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        email: data.email.toLowerCase(),
        phone: data.phone,
        customerName: data.fullName,
        shipFullName: data.fullName,
        shipLine1: data.shipping.line1,
        shipLine2: data.shipping.line2 || null,
        shipCity: data.shipping.city,
        shipState: data.shipping.state || null,
        shipPostalCode: data.shipping.postalCode,
        shipCountry: data.shipping.country,
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: data.paymentMethod,
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
    });

    for (const i of lineItems) {
      await tx.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
      });
    }

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });

  // Build the webhook payload (matches OrderPayload shape in webhooks.ts).
  const webhookPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: { name: order.customerName, email: order.email, phone: order.phone },
    items: lineItems.map((i) => ({
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

  const shippingAddress = [
    data.fullName,
    data.shipping.line1,
    data.shipping.line2,
    `${data.shipping.city}, ${data.shipping.state} ${data.shipping.postalCode}`,
    data.shipping.country,
  ]
    .filter(Boolean)
    .join("<br/>");

  // Fire-and-forget side effects; never let them block order placement.
  try {
    await dispatchWebhookEvent("order.created", webhookPayload);
  } catch (err) {
    console.error("[checkout] webhook dispatch failed:", err);
  }
  try {
    await sendOrderConfirmationEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      email: order.email,
      items: lineItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        priceCents: i.priceCents,
      })),
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      shippingAddress,
    });
  } catch (err) {
    console.error("[checkout] confirmation email failed:", err);
  }

  if (data.paymentMethod === "COD") {
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  }

  // Stripe payment.
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Online payment is not available right now. Please choose Cash on Delivery." },
      { status: 400 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  try {
    const stripeLineItems: import("stripe").Stripe.Checkout.SessionCreateParams.LineItem[] =
      lineItems.map((i) => ({
        price_data: {
          currency: "usd",
          product_data: { name: i.name },
          unit_amount: i.priceCents,
        },
        quantity: i.quantity,
      }));

    if (totals.shippingCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: totals.shippingCents,
        },
        quantity: 1,
      });
    }

    const sessionParams: import("stripe").Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: stripeLineItems,
      customer_email: order.email,
      success_url: `${origin}/order-confirmation/${order.orderNumber}`,
      cancel_url: `${origin}/checkout`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    };

    if (totals.discountCents > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: totals.discountCents,
        currency: "usd",
        duration: "once",
      });
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({
      ok: true,
      stripeUrl: checkoutSession.url,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Could not start the payment session. Please try again." },
      { status: 500 },
    );
  }
}
