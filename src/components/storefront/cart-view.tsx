"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, Leaf, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";

export function CartView() {
  const { lines, subtotalCents, updateQuantity, removeItem, isReady } = useCart();

  if (!isReady) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/50" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-xl border bg-muted/50" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add some fresh organic goodies to get started.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y rounded-xl border">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 p-4">
            <Link
              href={`/product/${line.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={line.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Leaf className="h-6 w-6" />
                </div>
              )}
            </Link>

            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/product/${line.slug}`}
                    className="font-medium leading-tight hover:text-brand-600"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatPrice(line.priceCents)} per {line.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(line.productId)}
                  aria-label={`Remove ${line.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center rounded-md border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                    disabled={line.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                    disabled={line.quantity >= line.maxStock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="font-semibold">
                  {formatPrice(line.priceCents * line.quantity)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-xl border p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Order summary</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotalCents)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Shipping &amp; taxes calculated at checkout.
        </p>
        <Separator className="my-4" />
        <Button asChild className="w-full" disabled={lines.length === 0}>
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  );
}
