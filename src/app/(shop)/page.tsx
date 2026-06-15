import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, Truck, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { getFeaturedProducts, getBestSellers } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { CATEGORY_SEED } from "@/lib/nav";

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true, imageUrl: true },
    });
  } catch {
    return [];
  }
}

const CATEGORY_IMAGES: Record<string, string> = {
  "fruits-vegetables": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80",
  "grains-cereals": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  "dairy-eggs": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
  beverages: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80",
  snacks: "https://images.unsplash.com/photo-1599629954294-14df9ec8bc05?w=600&q=80",
  "pantry-staples": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=600&q=80",
};

export default async function HomePage() {
  const [featured, bestSellers, categories] = await Promise.all([
    getFeaturedProducts(8),
    getBestSellers(4),
    getCategories(),
  ]);
  const cats = categories.length ? categories : CATEGORY_SEED.map((c) => ({ ...c, imageUrl: null }));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-50">
        <div className="container grid items-center gap-8 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
              <Leaf className="h-4 w-4" /> 100% Certified Organic
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-brand-900 md:text-5xl">
              Real food, grown the way nature intended.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Fresh, certified-organic groceries from small farms we trust — harvested at peak ripeness and
              delivered straight to your door.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop the market <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/products?category=fruits-vegetables">Fresh produce</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80"
              alt="Fresh organic produce at a market"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y bg-card">
        <div className="container grid gap-6 py-8 sm:grid-cols-3">
          {[
            { icon: Sprout, title: "Certified Organic", desc: "USDA Organic & Non-GMO verified" },
            { icon: Truck, title: "Free Delivery", desc: "On orders over $75" },
            { icon: ShieldCheck, title: "Farm-Fresh Guarantee", desc: "Love it or your money back" },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold">Shop by category</h2>
            <p className="mt-1 text-muted-foreground">Everything you need for a wholesome, organic kitchen.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="group relative overflow-hidden rounded-xl border"
            >
              <div className="relative aspect-square bg-muted">
                <Image
                  src={c.imageUrl || CATEGORY_IMAGES[c.slug] || CATEGORY_IMAGES["fruits-vegetables"]}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 33vw, 16vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-sm font-semibold text-white">{c.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container py-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-3xl font-bold">Featured this week</h2>
            <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="container py-14">
        <div className="relative overflow-hidden rounded-2xl bg-brand-700 px-8 py-12 text-center text-brand-50 md:py-16">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Get 15% off your first organic box</h2>
            <p className="mt-3 text-brand-100">
              Use code <span className="rounded bg-brand-600 px-2 py-0.5 font-mono font-bold">WELCOME15</span> at
              checkout. Fresh seasonal picks, zero commitment.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="container pb-16">
          <h2 className="mb-6 font-serif text-3xl font-bold">Best sellers</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
