"use client";

import { useState } from "react";
import { ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { useCart, type CartLine } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  product: Omit<CartLine, "quantity">;
  withQuantity?: boolean;
  className?: string;
};

// Add-to-cart control. On product detail pages it shows a quantity stepper; in
// listings it's a single button.
export function AddToCartButton({ product, withQuantity = false, className }: Props) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = product.maxStock <= 0;

  function handleAdd() {
    if (outOfStock) return;
    addItem(product, qty);
    setAdded(true);
    toast({ title: "Added to cart", description: `${product.name} × ${qty}` });
    setTimeout(() => setAdded(false), 1500);
  }

  if (outOfStock) {
    return (
      <Button disabled variant="secondary" className={className}>
        Out of stock
      </Button>
    );
  }

  return (
    <div className={withQuantity ? "flex flex-col gap-3 sm:flex-row" : ""}>
      {withQuantity && (
        <div className="flex items-center rounded-md border">
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQty((q) => Math.min(product.maxStock, q + 1))}
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Button onClick={handleAdd} className={className}>
        {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        {added ? "Added" : "Add to cart"}
      </Button>
    </div>
  );
}
