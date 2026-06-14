import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  const initial: Partial<ProductFormValues> = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDesc: product.shortDesc ?? "",
    description: product.description,
    priceDollars: (product.priceCents / 100).toFixed(2),
    compareAtDollars:
      product.compareAtCents != null ? (product.compareAtCents / 100).toFixed(2) : "",
    sku: product.sku ?? "",
    stock: String(product.stock),
    lowStockAt: String(product.lowStockAt),
    unit: product.unit,
    categoryId: product.categoryId,
    isOrganic: product.isOrganic,
    certification: product.certification ?? "",
    tags: product.tags.join(", "),
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isActive: product.isActive,
    images: product.images.map((img) => img.url),
  };

  return (
    <div>
      <PageHeader title="Edit product" description={product.name} />
      <ProductForm categories={categories} initial={initial} />
    </div>
  );
}
