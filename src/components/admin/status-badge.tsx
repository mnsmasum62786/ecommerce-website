import { Badge, type BadgeProps } from "@/components/ui/badge";

const ORDER_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  PROCESSING: "secondary",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const PAYMENT_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  UNPAID: "warning",
  PAID: "success",
  REFUNDED: "secondary",
  FAILED: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={ORDER_STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge variant={PAYMENT_STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>;
}
