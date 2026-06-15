import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  url: z.string().trim().url("A valid URL is required.").optional(),
  secret: z.string().min(8, "Secret must be at least 8 characters.").optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event.").optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid webhook data.", 400);
  }

  try {
    const webhook = await prisma.webhook.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ webhook });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return apiError("Webhook not found.", 404);
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await prisma.webhook.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return apiError("Webhook not found.", 404);
    }
    throw err;
  }
}
