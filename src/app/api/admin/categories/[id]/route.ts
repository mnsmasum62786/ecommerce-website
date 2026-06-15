import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { uniqueCategorySlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Category not found.", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid category data.", 400);
  }
  const data = parsed.data;

  // Prevent a category being its own parent.
  if (data.parentId && data.parentId === params.id) {
    return apiError("A category cannot be its own parent.", 400);
  }
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) return apiError("Selected parent category does not exist.", 400);
  }

  const updateData: Prisma.CategoryUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim() || null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.parentId !== undefined) {
    updateData.parent = data.parentId
      ? { connect: { id: data.parentId } }
      : { disconnect: true };
  }
  if (data.slug !== undefined && data.slug.trim()) {
    updateData.slug = await uniqueCategorySlug(data.slug.trim(), existing.id);
  } else if (data.name !== undefined) {
    updateData.slug = await uniqueCategorySlug(data.name, existing.id);
  }

  try {
    const category = await prisma.category.update({
      where: { id: existing.id },
      data: updateData,
    });
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update category.";
    return apiError(message, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return apiError("Category not found.", 404);

  if (existing._count.products > 0) {
    return apiError(
      "Cannot delete a category that still has products. Reassign or remove them first.",
      400,
    );
  }

  try {
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete category.";
    return apiError(message, 500);
  }
}
