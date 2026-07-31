import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { productInclude, serializeProduct } from "@/lib/api-serializers";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// /api/v1/products/{id} — the `{id}` segment accepts a product id OR its slug.
//   GET    (READ)  fetch a single product
//   PATCH  (WRITE) partial update (including full image replacement)
//   DELETE (WRITE) remove the product
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: { id: string } };

/**
 * Look a product up by primary key, falling back to its unique slug so callers
 * can use whichever identifier they hold.
 */
async function findProduct(identifier: string) {
  const byId = await prisma.product.findUnique({
    where: { id: identifier },
    include: productInclude,
  });
  if (byId) return byId;
  return prisma.product.findUnique({ where: { slug: identifier }, include: productInclude });
}

/** Product slug that is free, appending -2, -3, … on clashes. */
async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  const root = slugify(base) || "product";
  let candidate = root;
  let suffix = 1;
  for (;;) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey<Ctx>("READ", async (_req, { params }) => {
  const product = await findProduct(params.id);
  if (!product) return notFound("Product");
  return ok(serializeProduct(product));
});

// --- PATCH ------------------------------------------------------------------

const imageSchema = z.object({
  url: z.string().url("Image url must be a valid URL."),
  alt: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional(),
  compareAtCents: z.number().int().nonnegative().nullable().optional(),
  sku: z.string().optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  unit: z.string().min(1).optional(),
  isOrganic: z.boolean().optional(),
  certification: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  images: z.array(imageSchema).optional(),
});

export const PATCH = withApiKey<Ctx>("WRITE", async (req, { params }) => {
  const existing = await findProduct(params.id);
  if (!existing) return notFound("Product");

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const data: Prisma.ProductUpdateInput = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.shortDescription !== undefined) data.shortDesc = body.shortDescription?.trim() || null;
  if (body.priceCents !== undefined) data.priceCents = body.priceCents;
  if (body.compareAtCents !== undefined) data.compareAtCents = body.compareAtCents ?? null;
  if (body.sku !== undefined) data.sku = body.sku?.trim() || null;
  if (body.stock !== undefined) data.stock = body.stock;
  if (body.lowStockThreshold !== undefined) data.lowStockAt = body.lowStockThreshold;
  if (body.unit !== undefined) data.unit = body.unit;
  if (body.isOrganic !== undefined) data.isOrganic = body.isOrganic;
  if (body.certification !== undefined) data.certification = body.certification?.trim() || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
  if (body.isBestSeller !== undefined) data.isBestSeller = body.isBestSeller;
  if (body.tags !== undefined) data.tags = body.tags;

  // Slug: keep it unique, ignoring the product's own current slug.
  if (body.slug !== undefined) {
    data.slug = await uniqueSlug(body.slug, existing.id);
  }

  // Category: validate before writing so we can answer with a friendly 422.
  if (body.categoryId !== undefined || body.categorySlug !== undefined) {
    const category = await prisma.category.findFirst({
      where: body.categoryId ? { id: body.categoryId } : { slug: body.categorySlug! },
      select: { id: true },
    });
    if (!category) {
      return fail("invalid_category", "The requested category does not exist.", 422);
    }
    data.category = { connect: { id: category.id } };
  }

  // Images are replaced wholesale when the key is present: the payload is the
  // new, complete gallery and array order becomes `sortOrder`.
  if (body.images !== undefined) {
    data.images = {
      deleteMany: {},
      create: body.images.map((img, index) => ({
        url: img.url,
        alt: img.alt ?? null,
        sortOrder: index,
      })),
    };
  }

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data,
    include: productInclude,
  });

  return ok(serializeProduct(updated));
});

// --- DELETE -----------------------------------------------------------------

export const DELETE = withApiKey<Ctx>("WRITE", async (_req, { params }) => {
  const existing = await findProduct(params.id);
  if (!existing) return notFound("Product");

  // Safe to hard-delete: ProductImage cascades and OrderItem.productId is
  // `onDelete: SetNull`, so historical orders keep their name/price snapshot.
  await prisma.product.delete({ where: { id: existing.id } });

  return ok({ id: existing.id, deleted: true });
});
