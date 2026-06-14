import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          totalCents: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) notFound();

  const totalSpentCents = customer.orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div>
      <PageHeader
        title={customer.name ?? customer.email}
        description="Customer profile and order history."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to customers
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name: </span>
                {customer.name ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                {customer.email}
              </div>
              <div>
                <span className="text-muted-foreground">Joined: </span>
                {formatDate(customer.createdAt)}
              </div>
              <div className="flex gap-4 pt-2">
                <div>
                  <div className="text-2xl font-bold">{customer.orders.length}</div>
                  <div className="text-xs text-muted-foreground">Orders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatPrice(totalSpentCents)}</div>
                  <div className="text-xs text-muted-foreground">Total spent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved addresses.</p>
              ) : (
                <ul className="space-y-4 text-sm">
                  {customer.addresses.map((a) => (
                    <li key={a.id} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.fullName}</span>
                        {a.label && <Badge variant="outline">{a.label}</Badge>}
                        {a.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <div className="text-muted-foreground">{a.phone}</div>
                      <div className="text-muted-foreground">{a.line1}</div>
                      {a.line2 && <div className="text-muted-foreground">{a.line2}</div>}
                      <div className="text-muted-foreground">
                        {a.city}
                        {a.state ? `, ${a.state}` : ""} {a.postalCode}
                      </div>
                      <div className="text-muted-foreground">{a.country}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This customer has not placed any orders.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{formatPrice(order.totalCents)}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
