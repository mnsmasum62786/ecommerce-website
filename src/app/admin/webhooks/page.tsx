import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { WebhookManager } from "@/components/admin/webhook-manager";

export const dynamic = "force-dynamic";

// Hardcoded list of supported events (mirrors WEBHOOK_EVENTS in lib/webhooks).
const WEBHOOK_EVENTS = [
  "order.created",
  "order.paid",
  "order.status_changed",
  "order.cancelled",
] as const;

export default async function WebhooksPage() {
  const [webhooks, deliveries] = await Promise.all([
    prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { deliveries: true } } },
    }),
    prisma.webhookDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        webhook: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Notify external services in real time when orders are created, paid, updated, or cancelled."
      />
      <WebhookManager
        webhooks={webhooks.map((w) => ({
          id: w.id,
          name: w.name,
          url: w.url,
          secret: w.secret,
          events: w.events,
          isActive: w.isActive,
          deliveryCount: w._count.deliveries,
        }))}
        deliveries={deliveries.map((d) => ({
          id: d.id,
          event: d.event,
          webhookName: d.webhook?.name ?? "(deleted webhook)",
          orderNumber: d.order?.orderNumber ?? null,
          status: d.status,
          responseCode: d.responseCode,
          attempts: d.attempts,
          createdAt: d.createdAt.toISOString(),
        }))}
        events={[...WEBHOOK_EVENTS]}
      />
    </div>
  );
}
