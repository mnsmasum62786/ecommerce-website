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
import { categoryInclude, serializeCategory } from "@/lib/api-serializers";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// /api/v1/categories
//   GET  (READ)  list categories (optionally scoped to one parent)
//   POST (WRITE) create a category
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

// `position` is the merchant-facing name for the `sortOrder` column.
const SORTS = {
  position: [{ sortOrder: "asc" }, { name: "asc" }],
  name: [{ name: "asc" }],
  newest: [{ createdAt: "desc" }],
} satisfies Record<string, Prisma.CategoryOrderByWithRelationInput[]>;

type SortKey = keyof typeof SORTS;

function resolveSort(raw: string | null): Prisma.CategoryOrderByWithRelationInput[] {
  if (raw && raw in SORTS) return SORTS[raw as SortKey];
  return SORTS.position;
}

/** Category slug that is free, appending -2, -3, … on clashes. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "category";
  let candidate = root;
  let suffix = 1;
  for (;;) {
    const existing = await prisma.category.findUnique({
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

  const where: Prisma.CategoryWhereInput = {};
  const and: Prisma.CategoryWhereInput[] = [];

  const search = params.get("search")?.trim();
  if (search) and.push({ name: { contains: search, mode: "insensitive" } });

  // `parent=root` selects top-level categories; otherwise it is a parent id or
  // parent slug and we scope to that parent's direct children.
  const parent = params.get("parent")?.trim();
  if (parent === "root") {
    and.push({ parentId: null });
  } else if (parent) {
    and.push({ OR: [{ parentId: parent }, { parent: { slug: parent } }] });
  }

  if (and.length) where.AND = and;

  const [rows, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: categoryInclude,
      orderBy: resolveSort(params.get("sort")),
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.category.count({ where }),
  ]);

  return ok(rows.map(serializeCategory), { meta: paginationMeta(total, pagination) });
});

// --- POST -------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1, "Name is required."),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("imageUrl must be a valid URL.").optional().nullable(),
  parentId: z.string().min(1).nullable().optional(),
  position: z.number().int().default(0),
});

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Validate the parent up-front for a friendly error instead of an FK failure.
  if (body.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: body.parentId },
      select: { id: true },
    });
    if (!parent) return fail("invalid_parent", "The requested parent category does not exist.", 422);
  }

  const slug = await uniqueSlug(body.slug?.trim() || body.name);

  const data: Prisma.CategoryCreateInput = {
    name: body.name,
    slug,
    description: body.description?.trim() || null,
    imageUrl: body.imageUrl?.trim() || null,
    sortOrder: body.position,
  };
  if (body.parentId) data.parent = { connect: { id: body.parentId } };

  const created = await prisma.category.create({ data, include: categoryInclude });

  return ok(serializeCategory(created), { status: 201 });
});
