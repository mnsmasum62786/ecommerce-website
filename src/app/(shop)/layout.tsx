import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { getStoreSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true },
    });
  } catch {
    return [];
  }
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [store, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader storeName={store.storeName} announcement={store.announcement} categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
