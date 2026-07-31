import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  scopes: z.array(z.enum(["READ", "WRITE"])).min(1).optional(),
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid request.", 400);
  }

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("API key not found.", 404);

  const updated = await prisma.apiKey.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({
    apiKey: {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      requestCount: updated.requestCount,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
    },
  });
}

/** Permanently revoke (delete) a key. Any client using it starts failing immediately. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("API key not found.", 404);

  await prisma.apiKey.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
