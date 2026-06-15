import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the organic groceries in your cart before checking out.",
};

export default function CartPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-brand-900">Your Cart</h1>
      <CartView />
    </div>
  );
}
