import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import {
  CategoryManager,
  type ManagedCategory,
} from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  const managed: ManagedCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    sortOrder: c.sortOrder,
    productCount: c._count.products,
  }));

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your catalog into browsable categories."
      />
      <CategoryManager categories={managed} />
    </div>
  );
}
