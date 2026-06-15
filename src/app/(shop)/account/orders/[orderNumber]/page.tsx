import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order Details" };

const TIMELINE = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING: "warning",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function OrderDetailPage({
  params,
}: {
  params: { orderNumber: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/account/orders/${params.orderNumber}`);
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: true },
  });

  // 404 if missing or not owned by the logged-in user.
  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  const cancelled = order.status === "CANCELLED";
  const currentIndex = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);

  const shippingLines = [
    order.shipFullName,
    order.shipLine1,
    order.shipLine2,
    [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(", "),
    order.shipCountry,
  ].filter(Boolean);

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            ← All orders
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{order.status}</Badge>
      </div>

      {/* Status timeline */}
      <section className="rounded-xl border p-6">
        <h2 className="mb-5 font-semibold">Order status</h2>
        {cancelled ? (
          <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This order has been cancelled.
          </p>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {TIMELINE.map((step, i) => {
              const done = i <= currentIndex;
              const active = i === currentIndex;
              return (
                <li key={step} className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2",
                      done
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs capitalize",
                      active ? "font-semibold text-brand-700" : "text-muted-foreground",
                    )}
                  >
                    {step.toLowerCase()}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Items & totals */}
      <section className="mt-6 rounded-xl border p-6">
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
      </section>

      <section className="mt-6 grid gap-5 rounded-xl border p-6 sm:grid-cols-2">
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
      </section>
    </div>
  );
}
