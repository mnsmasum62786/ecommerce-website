import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/** Generate a category slug that is unique, appending -2, -3, ... if taken. */
export async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "category";
  let candidate = root;
  let suffix = 1;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

/** Generate a slug that is unique across products, appending -2, -3, ... if taken. */
export async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "product";
  let candidate = root;
  let suffix = 1;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}
