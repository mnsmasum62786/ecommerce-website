import type { Metadata } from "next";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getStoreSettings } from "@/lib/settings";
import { isStripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order of fresh, certified-organic groceries.",
};

export default async function CheckoutPage() {
  const store = await getStoreSettings();

  return (
    <div className="container py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-brand-900">Checkout</h1>
      <CheckoutForm
        stripeEnabled={isStripeEnabled()}
        shippingFlatCents={store.shippingFlatCents}
        freeShippingThreshold={store.freeShippingThreshold}
        taxRatePercent={store.taxRatePercent}
        currencySymbol={store.currencySymbol}
      />
    </div>
  );
}
