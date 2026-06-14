import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCard } from "@/lib/products";
import { ProductCard } from "@/components/storefront/product-card";
import { CatalogControls } from "@/components/storefront/catalog-controls";
import { CATEGORY_SEED } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All Products",
  description:
    "Browse our full range of fresh, certified-organic groceries — produce, dairy, pantry staples, snacks and more.",
};

const PAGE_SIZE = 12;

// Matches the card select used in src/lib/products.ts.
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

type SearchParams = {
  category?: string;
  q?: string;
  sort?: string;
  tag?: string;
  page?: string;
};

function buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { priceCents: "asc" };
    case "price-desc":
      return { priceCents: "desc" };
    case "name-asc":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

async function getCategories() {
  try {
    const cats = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true },
    });
    if (cats.length) return cats;
  } catch {
    /* fall through to seed */
  }
  return CATEGORY_SEED.map((c) => ({ name: c.name, slug: c.slug }));
}

function hrefWith(base: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sort = searchParams.sort ?? "newest";
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category ?? "";
  const tag = searchParams.tag ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (category) where.category = { slug: category };
  if (tag) where.tags = { has: tag };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { shortDesc: { contains: q, mode: "insensitive" } },
    ];
  }

  let products: ReturnType<typeof toCard>[] = [];
  let total = 0;
  const categories = await getCategories();

  try {
    const [rows, count] = await Promise.all([
      prisma.product.findMany({
        where,
        select: cardSelect,
        orderBy: buildOrderBy(sort),
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]);
    products = rows.map(toCard);
    total = count;
  } catch {
    products = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCategory = categories.find((c) => c.slug === category);
  const baseParams: SearchParams = { category, q, sort, tag };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-brand-900">
          {activeCategory ? activeCategory.name : "Shop All Products"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Fresh, certified-organic groceries delivered to your door.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar / category filters */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </h2>
          <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            <Link
              href={hrefWith(baseParams, { category: undefined, page: undefined })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-brand-50 hover:text-brand-700",
                !category && "bg-brand-100 font-medium text-brand-700",
              )}
            >
              All products
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={hrefWith(baseParams, { category: c.slug, page: undefined })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-brand-50 hover:text-brand-700",
                  category === c.slug && "bg-brand-100 font-medium text-brand-700",
                )}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main column */}
        <div>
          <div className="mb-6">
            <CatalogControls currentSort={sort} currentQuery={q} />
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            {total === 0
              ? "No products found"
              : `${total} product${total === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}`}
          </p>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <p className="text-lg font-medium">No products match your filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different category or search term.
              </p>
              <Link
                href="/products"
                className="mt-4 text-sm font-medium text-brand-600 hover:underline"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-1"
              aria-label="Pagination"
            >
              <PageLink
                href={hrefWith(baseParams, { page: String(page - 1) })}
                disabled={page <= 1}
              >
                Previous
              </PageLink>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={hrefWith(baseParams, { page: p === 1 ? undefined : String(p) })}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm transition-colors hover:bg-brand-50",
                    p === page
                      ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
                      : "border-input",
                  )}
                >
                  {p}
                </Link>
              ))}
              <PageLink
                href={hrefWith(baseParams, { page: String(page + 1) })}
                disabled={page >= totalPages}
              >
                Next
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-md border border-input px-3 text-sm text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-md border border-input px-3 text-sm transition-colors hover:bg-brand-50"
    >
      {children}
    </Link>
  );
}
