import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { uniqueProductSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  name: z.string().min(1, "Name is required."),
  slug: z.string().optional(),
  shortDesc: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required."),
  priceCents: z.number().int().nonnegative(),
  compareAtCents: z.number().int().nonnegative().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.number().int().nonnegative().default(0),
  lowStockAt: z.number().int().nonnegative().default(5),
  unit: z.string().min(1).default("each"),
  categoryId: z.string().min(1, "Category is required."),
  isOrganic: z.boolean().default(true),
  certification: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).default([]),
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

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid product data.", 400);
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return apiError("Selected category does not exist.", 400);

  const slug = await uniqueProductSlug(data.slug?.trim() || data.name);

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        shortDesc: data.shortDesc || null,
        description: data.description,
        priceCents: data.priceCents,
        compareAtCents: data.compareAtCents ?? null,
        sku: data.sku?.trim() || null,
        stock: data.stock,
        lowStockAt: data.lowStockAt,
        unit: data.unit,
        categoryId: data.categoryId,
        isOrganic: data.isOrganic,
        certification: data.certification?.trim() || null,
        tags: data.tags,
        isFeatured: data.isFeatured,
        isBestSeller: data.isBestSeller,
        isActive: data.isActive,
        images: {
          create: data.images.map((url, index) => ({ url, sortOrder: index })),
        },
      },
    });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create product.";
    // Likely a unique-constraint clash on sku.
    if (message.includes("Unique constraint")) {
      return apiError("A product with that SKU already exists.", 400);
    }
    return apiError(message, 500);
  }
}
