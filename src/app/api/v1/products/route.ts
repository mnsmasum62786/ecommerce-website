import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ok,
  fail,
  preflight,
  withApiKey,
  readPagination,
  paginationMeta,
  parseBody,
} from "@/lib/api-v1";
import { productInclude, serializeProduct } from "@/lib/api-serializers";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// /api/v1/products — public REST collection endpoint for the catalog.
//   GET  (READ)  list + filter + sort + paginate products
//   POST (WRITE) create a product (with nested images)
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

// --- Sorting ----------------------------------------------------------------

const SORTS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  price_asc: { priceCents: "asc" },
  price_desc: { priceCents: "desc" },
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  stock_asc: { stock: "asc" },
} satisfies Record<string, Prisma.ProductOrderByWithRelationInput>;

type SortKey = keyof typeof SORTS;

function resolveSort(raw: string | null): Prisma.ProductOrderByWithRelationInput {
  if (raw && raw in SORTS) return SORTS[raw as SortKey];
  return SORTS.newest;
}

// --- Slug helper ------------------------------------------------------------

/**
 * Turn `base` into a product slug that is free, appending -2, -3, … on clashes.
 * `excludeId` lets an update keep its own slug.
 */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "product";
  let candidate = root;
  let suffix = 1;
  // Bounded by the number of colliding slugs, which in practice is tiny.
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

export const GET = withApiKey("READ", async (req) => {
  const url = new URL(req.url);
  const pagination = readPagination(url);
  const params = url.searchParams;

  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  // Free-text search across the fields a merchant would look in.
  const search = params.get("search")?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // `category` accepts either a category slug or a category id.
  const category = params.get("category")?.trim();
  if (category) {
    and.push({ OR: [{ categoryId: category }, { category: { slug: category } }] });
  }

  const tag = params.get("tag")?.trim();
  if (tag) and.push({ tags: { has: tag } });

  // This is an admin-grade API: when `active` is omitted we return every
  // product regardless of its published state.
  const active = params.get("active");
  if (active === "true") and.push({ isActive: true });
  else if (active === "false") and.push({ isActive: false });

  if (params.get("inStock") === "true") and.push({ stock: { gt: 0 } });

  if (and.length) where.AND = and;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: resolveSort(params.get("sort")),
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return ok(rows.map(serializeProduct), { meta: paginationMeta(total, pagination) });
});

// --- POST -------------------------------------------------------------------

const imageSchema = z.object({
  url: z.string().url("Image url must be a valid URL."),
  alt: z.string().optional(),
});

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required."),
    description: z.string().min(1, "Description is required."),
    slug: z.string().optional(),
    shortDescription: z.string().optional().nullable(),
    priceCents: z.number().int().nonnegative(),
    compareAtCents: z.number().int().nonnegative().nullable().optional(),
    sku: z.string().optional().nullable(),
    stock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    unit: z.string().min(1).default("each"),
    isOrganic: z.boolean().default(true),
    certification: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    categoryId: z.string().min(1).optional(),
    categorySlug: z.string().min(1).optional(),
    images: z.array(imageSchema).optional(),
  })
  .refine((d) => Boolean(d.categoryId || d.categorySlug), {
    message: "Either categoryId or categorySlug is required.",
    path: ["categoryId"],
  });

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Resolve the category up-front so we can return a friendly 422 rather than
  // letting Prisma throw a foreign-key error.
  const category = await prisma.category.findFirst({
    where: body.categoryId ? { id: body.categoryId } : { slug: body.categorySlug! },
    select: { id: true },
  });
  if (!category) {
    return fail("invalid_category", "The requested category does not exist.", 422);
  }

  const slug = await uniqueSlug(body.slug?.trim() || body.name);

  const created = await prisma.product.create({
    data: {
      name: body.name,
      slug,
      description: body.description,
      shortDesc: body.shortDescription?.trim() || null,
      priceCents: body.priceCents,
      compareAtCents: body.compareAtCents ?? null,
      sku: body.sku?.trim() || null,
      stock: body.stock,
      lowStockAt: body.lowStockThreshold,
      unit: body.unit,
      isOrganic: body.isOrganic,
      certification: body.certification?.trim() || null,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      isBestSeller: body.isBestSeller,
      tags: body.tags,
      category: { connect: { id: category.id } },
      images: {
        create: (body.images ?? []).map((img, index) => ({
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: index,
        })),
      },
    },
    include: productInclude,
  });

  return ok(serializeProduct(created), { status: 201 });
});
