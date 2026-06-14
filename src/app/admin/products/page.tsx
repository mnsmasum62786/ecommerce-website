import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import {
  ProductBulkTable,
  type BulkProductRow,
} from "@/components/admin/product-bulk-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const categoryId = searchParams.category?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const rows: BulkProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.images[0]?.url ?? null,
    categoryName: p.category.name,
    priceCents: p.priceCents,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    isActive: p.isActive,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("category", categoryId);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <PageHeader title="Products" description={`${total} product(s) in your catalog.`}>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </Button>
      </PageHeader>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name or SKU..."
          className="max-w-xs"
        />
        <select
          name="category"
          defaultValue={categoryId}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(q || categoryId) && (
          <Button asChild variant="ghost">
            <Link href="/admin/products">Clear</Link>
          </Button>
        )}
      </form>

      <ProductBulkTable products={rows} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageHref(page - 1)} aria-disabled={page <= 1}>
                Previous
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={pageHref(page + 1)} aria-disabled={page >= totalPages}>
                Next
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
