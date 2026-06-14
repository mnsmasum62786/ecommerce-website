import Link from "next/link";
import { DollarSign, ShoppingBag, Users, Clock, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart } from "@/components/admin/sales-chart";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DAYS = 14;

export default async function AdminDashboardPage() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS - 1));

  const [revenueAgg, ordersCount, customersCount, pendingCount, recentOrders, paidOrders] =
    await Promise.all([
      prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { paymentStatus: "PAID" },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          email: true,
          totalCents: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { paymentStatus: "PAID", createdAt: { gte: since } },
        select: { totalCents: true, createdAt: true },
      }),
    ]);

  // All active products, then filter low-stock in JS (Prisma can't compare two
  // columns directly).
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, stock: true, lowStockAt: true, sku: true },
    orderBy: { stock: "asc" },
  });
  const lowStock = activeProducts.filter((p) => p.stock <= p.lowStockAt).slice(0, 8);

  // Build a continuous 14-day series so days with no sales still appear.
  const buckets = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), 0);
  }
  for (const order of paidOrders) {
    const key = dayKey(order.createdAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + order.totalCents);
  }
  const chartData = Array.from(buckets.entries()).map(([key, cents]) => ({
    date: new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    total: Math.round(cents) / 100,
  }));

  const totalRevenueCents = revenueAgg._sum.totalCents ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your store's performance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatPrice(totalRevenueCents)}
          hint="From paid orders"
        />
        <StatCard icon={ShoppingBag} label="Orders" value={ordersCount} hint="All time" />
        <StatCard icon={Users} label="Customers" value={customersCount} hint="Registered" />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pendingCount}
          hint="Awaiting processing"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue, last {DAYS} days</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All products are well stocked.
              </p>
            ) : (
              <ul className="space-y-3">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="min-w-0 truncate font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <Badge variant={p.stock <= 0 ? "destructive" : "warning"}>
                      {p.stock <= 0 ? "Out" : `${p.stock} left`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/admin/inventory">View inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.email}</div>
                    </TableCell>
                    <TableCell>{formatPrice(order.totalCents)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function dayKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
