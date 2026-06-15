import Link from "next/link";
import { OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

function isOrderStatus(value: string): value is OrderStatus {
  return (Object.values(OrderStatus) as string[]).includes(value);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const statusParam = searchParams.status?.trim() ?? "";
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (statusParam && isOrderStatus(statusParam)) where.status = statusParam;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        email: true,
        totalCents: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(params: { status?: string; page?: number }): string {
    const sp = new URLSearchParams();
    const status = params.status ?? statusParam;
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    const qs = sp.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order(s).`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={buildHref({ status: f.value, page: 1 })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              statusParam === f.value
                ? "bg-brand-100 text-brand-800"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        {statusParam && <input type="hidden" name="status" value={statusParam} />}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search order #, name or email..."
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href={buildHref({ page: 1 })}>Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-lg border bg-card">
        {orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No orders found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.email}</div>
                  </TableCell>
                  <TableCell>{formatPrice(order.totalCents)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/orders/${order.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={buildHref({ page: page - 1 })}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={buildHref({ page: page + 1 })}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
