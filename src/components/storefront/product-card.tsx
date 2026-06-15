import Link from "next/link";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents: number | null;
  unit: string;
  stock: number;
  isOrganic: boolean;
  imageUrl: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = product.compareAtCents && product.compareAtCents > product.priceCents;
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Leaf className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isOrganic && (
            <Badge variant="success" className="gap-1">
              <Leaf className="h-3 w-3" /> Organic
            </Badge>
          )}
          {onSale && <Badge variant="destructive">Sale</Badge>}
          {product.stock <= 0 && <Badge variant="secondary">Sold out</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`} className="flex-1">
          <h3 className="line-clamp-2 font-medium leading-tight hover:text-brand-600">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">per {product.unit}</p>
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg font-bold text-brand-700">{formatPrice(product.priceCents)}</span>
          {onSale && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compareAtCents!)}
            </span>
          )}
        </div>
        <div className="mt-3">
          <AddToCartButton
            className="w-full"
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              unit: product.unit,
              maxStock: product.stock,
            }}
          />
        </div>
      </div>
    </div>
  );
}
