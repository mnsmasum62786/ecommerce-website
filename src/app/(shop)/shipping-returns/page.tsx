import type { Metadata } from "next";
import { Truck, RotateCcw, PackageCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Shipping rates, delivery times, and our 30-day return policy at Verdant Organic Market.",
};

export default function ShippingReturnsPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-serif text-4xl font-bold text-brand-900">Shipping &amp; Returns</h1>
      <p className="mt-2 text-muted-foreground">
        Fresh delivery you can rely on, backed by a friendly returns policy.
      </p>

      <section className="mt-10 rounded-xl border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <Truck className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold">Shipping rates &amp; times</h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
          <li className="flex justify-between border-b pb-3">
            <span className="font-medium text-foreground">Flat-rate shipping</span>
            <span>$5.99 per order</span>
          </li>
          <li className="flex justify-between border-b pb-3">
            <span className="font-medium text-foreground">Free shipping</span>
            <span>On all orders over $75</span>
          </li>
          <li className="flex justify-between border-b pb-3">
            <span className="font-medium text-foreground">Standard delivery</span>
            <span>3–5 business days</span>
          </li>
          <li className="flex justify-between">
            <span className="font-medium text-foreground">Express delivery</span>
            <span>1–2 business days (+$7.00)</span>
          </li>
        </ul>
        <p className="mt-5 text-sm text-muted-foreground">
          Orders are processed Monday through Friday. Perishable items ship in insulated, recyclable
          packaging with food-safe cooling to ensure they arrive fresh.
        </p>
      </section>

      <section className="mt-8 rounded-xl border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold">30-day returns</h2>
        </div>
        <div className="mt-5 space-y-4 text-sm text-muted-foreground">
          <p>
            We stand behind everything we sell. If you&apos;re not completely satisfied, contact us
            within <strong>30 days</strong> of delivery for a full refund or replacement.
          </p>
          <p>
            Because many of our products are perishable, we may ask for a photo of the item rather than
            requesting a return shipment. For non-perishable goods, items should be unopened and in
            their original packaging.
          </p>
          <p>
            Refunds are issued to your original payment method within 5–7 business days once your
            request is approved.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-brand-50 p-6">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-brand-900">Need help with an order?</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Visit our{" "}
          <a href="/contact" className="text-brand-600">
            contact page
          </a>{" "}
          and our team will be happy to assist you.
        </p>
      </section>
    </div>
  );
}
