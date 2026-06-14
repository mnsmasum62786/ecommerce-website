import { NextResponse } from "next/server";
import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { signPayload } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const TEST_EVENT = "order.created";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const webhook = await prisma.webhook.findUnique({ where: { id: params.id } });
  if (!webhook) return apiError("Webhook not found.", 404);

  // Build a representative sample order.created payload.
  const body = JSON.stringify({
    event: TEST_EVENT,
    timestamp: new Date().toISOString(),
    test: true,
    data: {
      orderId: "test_order_id",
      orderNumber: "VRD-TEST-SAMPLE",
      status: "PENDING",
      paymentStatus: "UNPAID",
      customer: { name: "Sample Customer", email: "sample@example.com", phone: "+1 (555) 010-2345" },
      items: [
        { name: "Organic Hass Avocados", quantity: 2, priceCents: 499 },
        { name: "Free-Range Eggs (12 ct)", quantity: 1, priceCents: 649 },
      ],
      totals: {
        subtotalCents: 1647,
        shippingCents: 599,
        taxCents: 0,
        discountCents: 0,
        totalCents: 2246,
      },
    },
  });

  const signature = signPayload(webhook.secret, body);

  let status: DeliveryStatus = DeliveryStatus.PENDING;
  let responseCode: number | null = null;
  let responseBody = "";

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Verdant-Event": TEST_EVENT,
        "X-Verdant-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    responseCode = res.status;
    responseBody = (await res.text()).slice(0, 2000);
    status = res.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED;
  } catch (err) {
    status = DeliveryStatus.FAILED;
    responseBody = String(err).slice(0, 2000);
  }

  await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: TEST_EVENT,
      payload: body,
      status,
      responseCode,
      responseBody,
      attempts: 1,
    },
  });

  return NextResponse.json({ status, responseCode });
}
