import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Supported outbound webhook events.
export const WEBHOOK_EVENTS = [
  "order.created",
  "order.paid",
  "order.status_changed",
  "order.cancelled",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Compute the HMAC-SHA256 signature used in the X-Verdant-Signature header. */
export function signPayload(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

type OrderPayload = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customer: { name: string; email: string; phone: string };
  items: { name: string; quantity: number; priceCents: number }[];
  totals: {
    subtotalCents: number;
    shippingCents: number;
    taxCents: number;
    discountCents: number;
    totalCents: number;
  };
};

/**
 * Dispatch a webhook event to every active subscriber. Each delivery is logged
 * and retried once on failure. Designed to never throw into the caller so order
 * processing is never blocked by webhook problems.
 */
export async function dispatchWebhookEvent(
  event: WebhookEvent,
  order: OrderPayload,
): Promise<void> {
  let webhooks;
  try {
    webhooks = await prisma.webhook.findMany({ where: { isActive: true } });
  } catch (err) {
    console.error("[webhooks] Failed to load subscribers:", err);
    return;
  }

  const subscribers = webhooks.filter((w) => w.events.includes(event));
  if (subscribers.length === 0) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: order,
  });

  await Promise.all(
    subscribers.map((webhook) => deliver(webhook.id, webhook.url, webhook.secret, event, body, order.orderId)),
  );
}

async function deliver(
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  body: string,
  orderId: string,
  attempt = 1,
): Promise<void> {
  const signature = signPayload(secret, body);
  const maxAttempts = 2;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Verdant-Event": event,
        "X-Verdant-Signature": signature,
      },
      body,
      // Avoid hanging forever on a dead endpoint.
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = (await res.text()).slice(0, 2000);
    const ok = res.ok;

    if (!ok && attempt < maxAttempts) {
      // Retry once on failure.
      return deliver(webhookId, url, secret, event, body, orderId, attempt + 1);
    }

    await logDelivery(webhookId, orderId, event, body, ok ? "SUCCESS" : "FAILED", res.status, responseBody, attempt);
  } catch (err) {
    if (attempt < maxAttempts) {
      return deliver(webhookId, url, secret, event, body, orderId, attempt + 1);
    }
    await logDelivery(webhookId, orderId, event, body, "FAILED", null, String(err).slice(0, 2000), attempt);
  }
}

async function logDelivery(
  webhookId: string,
  orderId: string,
  event: string,
  payload: string,
  status: "SUCCESS" | "FAILED",
  responseCode: number | null,
  responseBody: string,
  attempts: number,
) {
  try {
    await prisma.webhookDelivery.create({
      data: { webhookId, orderId, event, payload, status, responseCode, responseBody, attempts },
    });
  } catch (err) {
    console.error("[webhooks] Failed to log delivery:", err);
  }
}
