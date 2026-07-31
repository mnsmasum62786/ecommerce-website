import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { categoryInclude, serializeCategory } from "@/lib/api-serializers";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// /api/v1/categories/{id} — the `{id}` segment accepts an id OR a slug.
//   GET    (READ)  fetch a single category
//   PATCH  (WRITE) partial update
//   DELETE (WRITE) remove a category (only when empty and childless)
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: { id: string } };

/** Look a category up by primary key, falling back to its unique slug. */
async function findCategory(identifier: string) {
  const byId = await prisma.category.findUnique({
    where: { id: identifier },
    include: categoryInclude,
  });
  if (byId) return byId;
  return prisma.category.findUnique({ where: { slug: identifier }, include: categoryInclude });
}

/** Category slug that is free, appending -2, -3, … on clashes. */
async function uniqueSlug(base: string, excludeId: string): Promise<string> {
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

export const GET = withApiKey<Ctx>("READ", async (_req, { params }) => {
  const category = await findCategory(params.id);
  if (!category) return notFound("Category");
  return ok(serializeCategory(category));
});

// --- PATCH ------------------------------------------------------------------

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("imageUrl must be a valid URL.").optional().nullable(),
  parentId: z.string().min(1).nullable().optional(),
  position: z.number().int().optional(),
});

export const PATCH = withApiKey<Ctx>("WRITE", async (req, { params }) => {
  const existing = await findCategory(params.id);
  if (!existing) return notFound("Category");

  const parsed = await parseBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const data: Prisma.CategoryUpdateInput = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl?.trim() || null;
  if (body.position !== undefined) data.sortOrder = body.position;
  if (body.slug !== undefined) data.slug = await uniqueSlug(body.slug, existing.id);

  if (body.parentId !== undefined) {
    if (body.parentId === null) {
      // Explicit null promotes the category to the top level.
      data.parent = { disconnect: true };
    } else {
      if (body.parentId === existing.id) {
        return fail("invalid_parent", "A category cannot be its own parent.", 422);
      }
      const parent = await prisma.category.findUnique({
        where: { id: body.parentId },
        select: { id: true },
      });
      if (!parent) {
        return fail("invalid_parent", "The requested parent category does not exist.", 422);
      }
      data.parent = { connect: { id: parent.id } };
    }
  }

  const updated = await prisma.category.update({
    where: { id: existing.id },
    data,
    include: categoryInclude,
  });

  return ok(serializeCategory(updated));
});

// --- DELETE -----------------------------------------------------------------

export const DELETE = withApiKey<Ctx>("WRITE", async (_req, { params }) => {
  const existing = await findCategory(params.id);
  if (!existing) return notFound("Category");

  // Product.categoryId is required, so a category holding products cannot be
  // removed without orphaning them. Children would silently be promoted to the
  // root (onDelete: SetNull), which is equally surprising — refuse both.
  if (existing._count.products > 0) {
    return fail(
      "category_not_empty",
      "Cannot delete a category that still contains products.",
      409,
    );
  }
  if (existing._count.children > 0) {
    return fail(
      "category_has_children",
      "Cannot delete a category that still has child categories.",
      409,
    );
  }

  await prisma.category.delete({ where: { id: existing.id } });

  return ok({ id: existing.id, deleted: true });
});
