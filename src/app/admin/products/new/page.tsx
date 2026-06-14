import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader
        title="Add product"
        description="Create a new product for your catalog."
      />
      <ProductForm categories={categories} />
    </div>
  );
}
