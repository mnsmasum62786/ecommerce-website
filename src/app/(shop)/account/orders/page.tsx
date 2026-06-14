import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Orders" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING: "warning",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      totalCents: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-brand-900">My orders</h1>
        <Link href="/account" className="text-sm font-medium text-brand-600 hover:underline">
          Back to account
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} · {order._count.items} item
                    {order._count.items === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{order.status}</Badge>
                  <span className="font-semibold">{formatPrice(order.totalCents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
