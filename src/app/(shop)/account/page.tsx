import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package, MapPin, ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Account" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDING: "warning",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const recentOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      totalCents: true,
    },
  });

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="font-serif text-3xl font-bold text-brand-900">
        Hello, {session.user.name || "there"}
      </h1>
      <p className="mt-1 text-muted-foreground">Welcome back to your account.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-brand-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">My orders</p>
            <p className="text-sm text-muted-foreground">Track and review your orders</p>
          </div>
        </Link>
        <Link
          href="/account/addresses"
          className="flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-brand-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Saved addresses</p>
            <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
          </div>
        </Link>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          {recentOrders.length > 0 && (
            <Link href="/account/orders" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
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
    </div>
  );
}
