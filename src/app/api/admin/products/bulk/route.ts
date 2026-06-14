import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one product."),
  action: z.enum(["activate", "deactivate", "delete"]),
});

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid request.", 400);
  }
  const { ids, action } = parsed.data;

  try {
    if (action === "delete") {
      const result = await prisma.product.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ count: result.count });
    }
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: action === "activate" },
    });
    return NextResponse.json({ count: result.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk action failed.";
    return apiError(message, 500);
  }
}
