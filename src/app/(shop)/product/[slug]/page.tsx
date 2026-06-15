import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Leaf } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toCard } from "@/lib/products";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductCard } from "@/components/storefront/product-card";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getProduct(slug: string) {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { name: true, slug: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product || !product.isActive) {
    return { title: "Product not found" };
  }
  const description =
    product.shortDesc ||
    product.description.slice(0, 155) ||
    `Buy ${product.name} — certified organic, delivered fresh.`;
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);
  if (!product || !product.isActive) notFound();

  const onSale =
    product.compareAtCents !== null && product.compareAtCents > product.priceCents;

  const stockLabel =
    product.stock <= 0
      ? "Out of stock"
      : product.stock <= product.lowStockAt
        ? `Only ${product.stock} left`
        : "In stock";

  let related: ReturnType<typeof toCard>[] = [];
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        NOT: { id: product.id },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        priceCents: true,
        compareAtCents: true,
        unit: true,
        stock: true,
        isOrganic: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    });
    related = rows.map(toCard);
  } catch {
    related = [];
  }

  return (
    <div className="container py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-brand-600">
          Shop
        </Link>
        <span>/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-brand-600"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <Link
            href={`/products?category=${product.category.slug}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900 md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-brand-700">
              {formatPrice(product.priceCents)}
            </span>
            {onSale && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.compareAtCents!)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">per {product.unit}</span>
          </div>

          {(product.isOrganic || product.certification) && (
            <div className="mt-4">
              <Badge variant="success" className="gap-1.5 px-3 py-1 text-sm">
                <Leaf className="h-4 w-4" />
                {product.certification || "Certified Organic"}
              </Badge>
            </div>
          )}

          {product.shortDesc && (
            <p className="mt-5 text-base text-muted-foreground">{product.shortDesc}</p>
          )}

          <div className="mt-5 flex items-center gap-2 text-sm">
            <span
              className={
                product.stock <= 0
                  ? "font-medium text-destructive"
                  : product.stock <= product.lowStockAt
                    ? "font-medium text-amber-600"
                    : "font-medium text-brand-600"
              }
            >
              {stockLabel}
            </span>
          </div>

          <div className="mt-6">
            <AddToCartButton
              withQuantity
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                imageUrl: product.images[0]?.url ?? null,
                unit: product.unit,
                maxStock: product.stock,
              }}
            />
          </div>

          <Separator className="my-8" />

          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-bold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
