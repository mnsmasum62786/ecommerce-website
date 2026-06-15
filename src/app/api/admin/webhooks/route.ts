import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  url: z.string().trim().url("A valid URL is required."),
  secret: z.string().min(8, "Secret must be at least 8 characters."),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Select at least one event."),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });
  return NextResponse.json({ webhooks });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid webhook data.", 400);
  }
  const d = parsed.data;

  const webhook = await prisma.webhook.create({
    data: {
      name: d.name,
      url: d.url,
      secret: d.secret,
      events: d.events,
      isActive: d.isActive,
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}
