"use client";

import * as React from "react";

// A cart line as stored client-side. We snapshot price/name/image so the cart
// renders instantly without refetching, and re-validate against the server at
// checkout time.
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  unit: string;
  quantity: number;
  maxStock: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isReady: boolean;
};

const CartContext = React.createContext<CartContextValue | null>(null);
const STORAGE_KEY = "verdant_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore malformed cart */
    }
    setIsReady(true);
  }, []);

  // Persist on every change (after initial hydration).
  React.useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, isReady]);

  const addItem = React.useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, line.maxStock);
        return prev.map((l) => (l.productId === line.productId ? { ...l, ...line, quantity: nextQty } : l));
      }
      return [...prev, { ...line, quantity: Math.min(quantity, line.maxStock) }];
    });
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxStock)) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = React.useCallback(() => setLines([]), []);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  const value: CartContextValue = {
    lines,
    count,
    subtotalCents,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    isReady,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
