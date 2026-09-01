import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Leaf, LockKeyhole, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toCard } from "@/lib/products";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductRating } from "@/components/storefront/product-rating";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { ViewItemTracker } from "@/components/storefront/trackers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { getDemoRating } from "@/lib/demo-merchandising";

export const dynamic = "force-dynamic";

const DEMO_REVIEWS = [
  {
    name: "Maya R.",
    quote: "Fresh on arrival, thoughtfully packed, and exactly as described. I would happily order it again.",
  },
  {
    name: "Daniel K.",
    quote: "The quality stood out immediately. Delivery was smooth and the product felt genuinely premium.",
  },
  {
    name: "Priya S.",
    quote: "A reliable pantry upgrade with great flavor. The freshness guarantee made trying it an easy decision.",
  },
];

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
  const savingsPercent = onSale
    ? Math.round(((product.compareAtCents! - product.priceCents) / product.compareAtCents!) * 100)
    : 0;
  const demoRating = getDemoRating(product.id, product.slug);

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
        isBestSeller: true,
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
    <div
      className="container py-8"
      data-product-id={product.id}
      data-product-name={product.name}
      data-product-price={(product.priceCents / 100).toFixed(2)}
      data-product-sku={product.sku ?? product.slug}
      data-product-category={product.category.name}
    >
      <ViewItemTracker
        item={{
          item_id: product.id,
          item_name: product.name,
          price: product.priceCents / 100,
          item_category: product.category.name,
        }}
      />
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

          <ProductRating productId={product.id} slug={product.slug} className="mt-3 text-sm" />

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

          {(product.isOrganic || product.certification || product.isBestSeller || onSale) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.isBestSeller && (
                <Badge className="gap-1.5 bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-500">
                  <BadgeCheck className="h-4 w-4" /> Customer favorite
                </Badge>
              )}
              {(product.isOrganic || product.certification) && (
              <Badge variant="success" className="gap-1.5 px-3 py-1 text-sm">
                <Leaf className="h-4 w-4" />
                {product.certification || "Certified Organic"}
              </Badge>
              )}
              {onSale && (
                <Badge variant="destructive" className="px-3 py-1 text-sm">
                  Save {savingsPercent}% today
                </Badge>
              )}
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

          <div className="mt-6 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
            <Assurance icon={Truck} title="Free shipping over $75" detail="Standard delivery in 3–5 business days" />
            <Assurance icon={RotateCcw} title="30-day guarantee" detail="Refund or replacement if it is not right" />
            <Assurance icon={LockKeyhole} title="Secure checkout" detail="Protected card or cash-on-delivery payment" />
            <Assurance icon={ShieldCheck} title="Freshness protected" detail="Packed to arrive fresh and ready to enjoy" />
          </div>

          <Link
            href="/shipping-returns"
            className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline"
          >
            See delivery and returns details
          </Link>

          <Separator className="my-8" />

          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h2 className="text-base font-semibold text-foreground">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="customer-feedback-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="customer-feedback-heading" className="font-serif text-2xl font-bold">
                Customer feedback
              </h2>
              <Badge variant="secondary">Demo data</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview social proof: {demoRating.rating.toFixed(1)} out of 5 from {demoRating.reviewCount} demo reviews.
            </p>
          </div>
          <ProductRating productId={product.id} slug={product.slug} className="text-sm" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {DEMO_REVIEWS.map((review) => (
            <article key={review.name} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{review.name}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                  <BadgeCheck className="h-3.5 w-3.5" /> Demo purchase
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                “{review.quote}”
              </p>
            </article>
          ))}
        </div>
      </section>

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

function Assurance({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
