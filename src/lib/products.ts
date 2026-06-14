import { prisma } from "@/lib/prisma";
import type { ProductCardData } from "@/components/storefront/product-card";
import type { Prisma } from "@prisma/client";

// Select only the fields the product card needs, plus the primary image.
const cardSelect = {
  id: true,
  slug: true,
  name: true,
  priceCents: true,
  compareAtCents: true,
  unit: true,
  stock: true,
  isOrganic: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
} satisfies Prisma.ProductSelect;

type RawCard = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function toCard(p: RawCard): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    unit: p.unit,
    stock: p.stock,
    isOrganic: p.isOrganic,
    imageUrl: p.images[0]?.url ?? null,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: cardSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCard);
  } catch {
    return [];
  }
}

export async function getBestSellers(limit = 4): Promise<ProductCardData[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isBestSeller: true },
      select: cardSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCard);
  } catch {
    return [];
  }
}
