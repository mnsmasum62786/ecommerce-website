"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Leaf, Loader2, Tag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import { trackBeginCheckout } from "@/lib/analytics";

// Delivery options mirror src/lib/pricing.ts (DELIVERY_OPTIONS).
const DELIVERY_OPTIONS = [
  { value: "standard", label: "Standard", eta: "3–5 business days", surchargeCents: 0 },
  { value: "express", label: "Express", eta: "1–2 business days", surchargeCents: 700 },
] as const;

type Props = {
  stripeEnabled: boolean;
  shippingFlatCents: number;
  freeShippingThreshold: number;
  taxRatePercent: number;
  currencySymbol: string;
};

type CouponState = { code: string; discountCents: number } | null;

export function CheckoutForm({
  stripeEnabled,
  shippingFlatCents,
  freeShippingThreshold,
  taxRatePercent,
}: Props) {
  const router = useRouter();
  const { lines, subtotalCents, isReady, clear } = useCart();
  const { toast } = useToast();

  const stripeAvailable =
    stripeEnabled && Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    customerNote: "",
  });
  const [deliveryOption, setDeliveryOption] = React.useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = React.useState<"STRIPE" | "COD">(
    stripeAvailable ? "STRIPE" : "COD",
  );
  const [couponInput, setCouponInput] = React.useState("");
  const [coupon, setCoupon] = React.useState<CouponState>(null);
  const [applyingCoupon, setApplyingCoupon] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Redirect to cart if it's empty (only once the cart has hydrated).
  React.useEffect(() => {
    if (isReady && lines.length === 0 && !submitting) {
      router.replace("/cart");
    }
  }, [isReady, lines.length, submitting, router]);

  // Fire begin_checkout once the cart has hydrated with items.
  const beganCheckout = React.useRef(false);
  React.useEffect(() => {
    if (!isReady || lines.length === 0 || beganCheckout.current) return;
    beganCheckout.current = true;
    trackBeginCheckout(
      lines.map((l) => ({
        item_id: l.productId,
        item_name: l.name,
        price: l.priceCents / 100,
        quantity: l.quantity,
      })),
    );
  }, [isReady, lines]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Mirror computeTotals from src/lib/pricing.ts for display.
  const discountCents = Math.min(coupon?.discountCents ?? 0, subtotalCents);
  const netSubtotal = subtotalCents - discountCents;
  const delivery = DELIVERY_OPTIONS.find((d) => d.value === deliveryOption) ?? DELIVERY_OPTIONS[0];
  let baseShipping = shippingFlatCents;
  if (netSubtotal >= freeShippingThreshold) baseShipping = 0;
  const shippingCents = baseShipping + delivery.surchargeCents;
  const taxCents = Math.round((netSubtotal * taxRatePercent) / 100);
  const totalCents = netSubtotal + shippingCents + taxCents;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotalCents }),
      });
      const data = await res.json();
      if (data.ok) {
        setCoupon({ code: data.code, discountCents: data.discountCents });
        toast({ title: "Coupon applied", description: `Discount: ${formatPrice(data.discountCents)}` });
      } else {
        setCoupon(null);
        toast({
          variant: "destructive",
          title: "Invalid coupon",
          description: data.error ?? "This coupon could not be applied.",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      router.replace("/cart");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          email: form.email,
          phone: form.phone,
          fullName: form.fullName,
          shipping: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
          },
          deliveryOption,
          paymentMethod,
          couponCode: coupon?.code,
          customerNote: form.customerNote || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Checkout failed",
          description: data.error ?? "Please review your details and try again.",
        });
        setSubmitting(false);
        return;
      }

      if (data.stripeUrl) {
        window.location.href = data.stripeUrl;
        return;
      }

      // Cash on delivery success.
      clear();
      router.push(`/order-confirmation/${data.orderNumber}`);
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
      setSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="h-96 animate-pulse rounded-xl border bg-muted/50" />
        <div className="h-72 animate-pulse rounded-xl border bg-muted/50" />
      </div>
    );
  }

  if (lines.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {/* Contact */}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 font-semibold">Contact details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Phone" required>
              <Input required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Shipping address */}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 font-semibold">Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" required className="sm:col-span-2">
              <Input required value={form.line1} onChange={(e) => update("line1", e.target.value)} />
            </Field>
            <Field label="Address line 2" className="sm:col-span-2">
              <Input value={form.line2} onChange={(e) => update("line2", e.target.value)} />
            </Field>
            <Field label="City" required>
              <Input required value={form.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="State / Province">
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
            </Field>
            <Field label="Postal code" required>
              <Input required value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </Field>
            <Field label="Country" required>
              <Input required value={form.country} onChange={(e) => update("country", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Delivery */}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 font-semibold">Delivery option</h2>
          <div className="space-y-3">
            {DELIVERY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={
                  "flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors " +
                  (deliveryOption === option.value ? "border-brand-600 bg-brand-50" : "hover:bg-muted/40")
                }
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="deliveryOption"
                    value={option.value}
                    checked={deliveryOption === option.value}
                    onChange={() => setDeliveryOption(option.value)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.eta}</span>
                  </span>
                </span>
                <span className="text-sm font-medium">
                  {option.surchargeCents === 0 ? "—" : `+${formatPrice(option.surchargeCents)}`}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 font-semibold">Payment method</h2>
          <div className="space-y-3">
            {stripeAvailable && (
              <label
                className={
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors " +
                  (paymentMethod === "STRIPE" ? "border-brand-600 bg-brand-50" : "hover:bg-muted/40")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="STRIPE"
                  checked={paymentMethod === "STRIPE"}
                  onChange={() => setPaymentMethod("STRIPE")}
                  className="h-4 w-4 accent-brand-600"
                />
                <span>
                  <span className="font-medium">Credit / Debit card</span>
                  <span className="block text-xs text-muted-foreground">
                    Secure payment powered by Stripe
                  </span>
                </span>
              </label>
            )}
            <label
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors " +
                (paymentMethod === "COD" ? "border-brand-600 bg-brand-50" : "hover:bg-muted/40")
              }
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                className="h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="font-medium">Cash on Delivery</span>
                <span className="block text-xs text-muted-foreground">Pay when your order arrives</span>
              </span>
            </label>
          </div>
        </section>

        {/* Note */}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 font-semibold">Order note (optional)</h2>
          <Textarea
            value={form.customerNote}
            onChange={(e) => update("customerNote", e.target.value)}
            placeholder="Delivery instructions, gate codes, etc."
          />
        </section>
      </div>

      {/* Order summary */}
      <aside className="h-fit space-y-4 rounded-xl border p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {line.imageUrl ? (
                  <Image src={line.imageUrl} alt={line.name} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Leaf className="h-5 w-5" />
                  </div>
                )}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white">
                  {line.quantity}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-sm leading-tight">{line.name}</span>
                <span className="text-sm font-medium">
                  {formatPrice(line.priceCents * line.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <Separator />

        {/* Coupon */}
        <div>
          {coupon ? (
            <div className="flex items-center justify-between rounded-md bg-brand-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-brand-700">
                <Tag className="h-4 w-4" /> {coupon.code}
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon code"
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                disabled={applyingCoupon || !couponInput.trim()}
              >
                {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <dl className="space-y-2 text-sm">
          <Row label="Subtotal" value={formatPrice(subtotalCents)} />
          {discountCents > 0 && (
            <Row label="Discount" value={`-${formatPrice(discountCents)}`} accent />
          )}
          <Row label="Shipping" value={shippingCents === 0 ? "Free" : formatPrice(shippingCents)} />
          {taxCents > 0 && <Row label="Tax" value={formatPrice(taxCents)} />}
        </dl>

        <Separator />

        <div className="flex items-center justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </>
          ) : paymentMethod === "STRIPE" ? (
            "Pay & place order"
          ) : (
            "Place order"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/cart" className="hover:underline">
            Back to cart
          </Link>
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "font-medium text-brand-700" : "font-medium"}>{value}</dd>
    </div>
  );
}
