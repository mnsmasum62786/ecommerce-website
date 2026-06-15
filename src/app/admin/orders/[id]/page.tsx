import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      webhookDeliveries: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { webhook: { select: { name: true } } },
      },
    },
  });

  if (!order) notFound();

  return (
    <div>
      <PageHeader title={`Order ${order.orderNumber}`} description={formatDateTime(order.createdAt)}>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatPrice(item.priceCents)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.priceCents * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
                <Row label="Shipping" value={formatPrice(order.shippingCents)} />
                <Row label="Tax" value={formatPrice(order.taxCents)} />
                {order.discountCents > 0 && (
                  <Row
                    label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                    value={`-${formatPrice(order.discountCents)}`}
                  />
                )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(order.totalCents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.webhookDeliveries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Webhook deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {order.webhookDeliveries.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{d.webhook?.name ?? "Webhook"}</span>
                      <span className="text-muted-foreground">{d.event}</span>
                      <span
                        className={
                          d.status === "SUCCESS"
                            ? "text-brand-700"
                            : d.status === "FAILED"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {d.status}
                        {d.responseCode != null ? ` (${d.responseCode})` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                {order.refundFlag && (
                  <span className="text-xs font-medium text-destructive">Refund flagged</span>
                )}
              </div>
              <Separator />
              <OrderStatusControl
                orderId={order.id}
                status={order.status}
                refundFlag={order.refundFlag}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{order.customerName}</div>
              <div className="text-muted-foreground">{order.email}</div>
              <div className="text-muted-foreground">{order.phone}</div>
              {order.userId && (
                <Button asChild variant="link" size="sm" className="px-0">
                  <Link href={`/admin/customers/${order.userId}`}>View customer</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{order.shipFullName}</div>
              <div>{order.shipLine1}</div>
              {order.shipLine2 && <div>{order.shipLine2}</div>}
              <div>
                {order.shipCity}
                {order.shipState ? `, ${order.shipState}` : ""} {order.shipPostalCode}
              </div>
              <div>{order.shipCountry}</div>
              <Separator className="my-2" />
              <div>Delivery: {order.deliveryOption}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>
                Method: <span className="text-foreground">{order.paymentMethod}</span>
              </div>
              <div>
                Status: <span className="text-foreground">{order.paymentStatus}</span>
              </div>
              {order.stripePaymentId && <div>Stripe: {order.stripePaymentId}</div>}
            </CardContent>
          </Card>

          {order.customerNote && (
            <Card>
              <CardHeader>
                <CardTitle>Customer note</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {order.customerNote}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
