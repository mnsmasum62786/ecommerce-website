import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { uniqueProductSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

// Every field is optional so this endpoint supports partial updates. The
// inventory editor relies on being able to PATCH only { stock, lowStockAt }.
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  shortDesc: z.string().optional().nullable(),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  compareAtCents: z.number().int().nonnegative().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  lowStockAt: z.number().int().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  isOrganic: z.boolean().optional(),
  certification: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // When provided, product images are fully replaced with this ordered list.
  images: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Product not found.", 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid product data.", 400);
  }
  const data = parsed.data;

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return apiError("Selected category does not exist.", 400);
  }

  // Build the scalar update payload, only including provided fields.
  const updateData: Prisma.ProductUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc || null;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priceCents !== undefined) updateData.priceCents = data.priceCents;
  if (data.compareAtCents !== undefined) updateData.compareAtCents = data.compareAtCents ?? null;
  if (data.sku !== undefined) updateData.sku = data.sku?.trim() || null;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.lowStockAt !== undefined) updateData.lowStockAt = data.lowStockAt;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
  if (data.isOrganic !== undefined) updateData.isOrganic = data.isOrganic;
  if (data.certification !== undefined) updateData.certification = data.certification?.trim() || null;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
  if (data.isBestSeller !== undefined) updateData.isBestSeller = data.isBestSeller;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  // Recompute slug only when name or slug is explicitly provided.
  if (data.slug !== undefined && data.slug.trim()) {
    updateData.slug = await uniqueProductSlug(data.slug.trim(), existing.id);
  } else if (data.name !== undefined) {
    updateData.slug = await uniqueProductSlug(data.name, existing.id);
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: updateData,
      });
      // If images are provided, delete & recreate the ProductImage rows.
      if (data.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        if (data.images.length > 0) {
          await tx.productImage.createMany({
            data: data.images.map((url, index) => ({
              productId: existing.id,
              url,
              sortOrder: index,
            })),
          });
        }
      }
      return updated;
    });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update product.";
    if (message.includes("Unique constraint")) {
      return apiError("A product with that SKU already exists.", 400);
    }
    return apiError(message, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Product not found.", 404);

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete product.";
    return apiError(message, 500);
  }
}
