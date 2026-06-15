import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about organic certification, delivery, returns, and payment at Verdant Organic Market.",
};

const FAQS = [
  {
    q: "What does “certified organic” actually mean?",
    a: "Certified organic means a product has been grown and handled according to strict standards — no synthetic pesticides, no synthetic fertilizers, no GMOs — and verified by an accredited certifying body such as the USDA. We display each product’s certification on its detail page.",
  },
  {
    q: "Is everything you sell organic?",
    a: "Yes. Every product in our catalog is certified organic. We do not stock conventional items, so you never have to read the fine print to know what you’re getting.",
  },
  {
    q: "How fast is delivery?",
    a: "Standard delivery arrives in 3–5 business days. Express delivery arrives in 1–2 business days for a small surcharge. You’ll choose your preferred option at checkout.",
  },
  {
    q: "How much does shipping cost?",
    a: "Shipping is a flat $5.99, and it’s free on orders over $75. Express delivery adds a $7.00 surcharge on top of the base rate.",
  },
  {
    q: "How do you keep perishable items fresh in transit?",
    a: "Perishables ship in insulated, recyclable packaging with food-safe cooling so they arrive cold and fresh. We harvest and pack as close to dispatch as possible to maximize shelf life.",
  },
  {
    q: "What is your return policy?",
    a: "If you’re not happy with your order, contact us within 30 days for a refund or replacement. Because many of our items are perishable, we may ask for a photo rather than a return shipment.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards through our secure Stripe checkout. Cash on Delivery is also available in eligible areas, so you can pay when your order arrives.",
  },
  {
    q: "Is my payment information secure?",
    a: "Absolutely. Card payments are processed by Stripe, a PCI-DSS Level 1 certified provider. We never see or store your full card details on our servers.",
  },
  {
    q: "Can I use a coupon code?",
    a: "Yes — enter your coupon code in the order summary at checkout and click Apply. Valid discounts are reflected in your total before you place the order.",
  },
  {
    q: "Do I need an account to order?",
    a: "No. You can check out as a guest. Creating an account lets you track orders, save addresses, and reorder faster.",
  },
];

export default function FaqPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-serif text-4xl font-bold text-brand-900">Frequently asked questions</h1>
      <p className="mt-2 text-muted-foreground">
        Everything you need to know about shopping with Verdant Organic Market.
      </p>

      <div className="mt-8 divide-y rounded-xl border">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {faq.q}
              <span className="ml-4 text-brand-600 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
