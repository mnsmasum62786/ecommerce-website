import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Thank you for your order with Verdant Organic Market.",
};

async function getOrder(orderNumber: string) {
  try {
    return await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
  } catch {
    return null;
  }
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING: "warning",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: { orderNumber: string };
}) {
  const order = await getOrder(params.orderNumber);

  if (!order) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-bold text-brand-900">Thank you for your order!</h1>
        <p className="mt-2 text-muted-foreground">
          Your order <strong>{params.orderNumber}</strong> has been received. A confirmation email is on
          its way.
        </p>
        <Button asChild className="mt-8">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const shippingLines = [
    order.shipFullName,
    order.shipLine1,
    order.shipLine2,
    [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(", "),
    order.shipCountry,
  ].filter(Boolean);

  return (
    <div className="container max-w-3xl py-12">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-bold text-brand-900">Thank you for your order!</h1>
        <p className="mt-2 text-muted-foreground">
          We&apos;ve received your order and are getting it ready. A confirmation email has been sent to{" "}
          {order.email}.
        </p>
      </div>

      <div className="mt-10 rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <p className="text-sm text-muted-foreground">Order number</p>
            <p className="font-semibold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Placed</p>
            <p className="font-medium">{formatDate(order.createdAt)}</p>
          </div>
          <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{order.status}</Badge>
        </div>

        <div className="p-5">
          <h2 className="mb-3 font-semibold">Items</h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <span>
                  {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="font-medium">{formatPrice(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <Separator className="my-4" />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-brand-700">
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd>-{formatPrice(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}</dd>
            </div>
            {order.taxCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatPrice(order.taxCents)}</dd>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-5 border-t p-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Shipping address</h3>
            <address className="not-italic text-sm text-muted-foreground">
              {shippingLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Payment</h3>
            <p className="text-sm text-muted-foreground">
              {order.paymentMethod === "COD" ? "Cash on Delivery" : "Card (Stripe)"}
              <span className="block">Status: {order.paymentStatus}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
