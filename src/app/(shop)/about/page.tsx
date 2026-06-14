import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, Sprout, Truck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Our story, mission, and commitment to sustainable, certified-organic food at Verdant Organic Market.",
};

const VALUES = [
  {
    icon: Sprout,
    title: "Grown with care",
    body: "We partner only with farms that practice regenerative, certified-organic agriculture — no synthetic pesticides, no GMOs, ever.",
  },
  {
    icon: Truck,
    title: "Fresh to your door",
    body: "Harvested at peak ripeness and shipped fast, so the produce you receive tastes the way nature intended.",
  },
  {
    icon: HeartHandshake,
    title: "Fair for farmers",
    body: "We pay our growers fairly and build long-term relationships that keep small, family-run farms thriving.",
  },
];

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-12">
      <div className="flex items-center gap-2 text-brand-600">
        <Leaf className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-wide">Our Story</span>
      </div>
      <h1 className="mt-3 font-serif text-4xl font-bold text-brand-900">
        Real food, grown the right way
      </h1>

      <div className="prose prose-neutral mt-8 max-w-none text-muted-foreground">
        <p>
          Verdant Organic Market began with a simple frustration: it was too hard to find groceries
          you could truly trust. Labels promised &ldquo;natural&rdquo; and &ldquo;farm fresh,&rdquo;
          but behind them were long supply chains, synthetic inputs, and produce that had spent weeks
          in transit. We knew there was a better way.
        </p>
        <p>
          So we built it. We started by visiting the farms ourselves — walking the fields, meeting the
          people, and verifying every certification. Today, every product we carry is certified
          organic and sourced from growers who share our belief that food should nourish people and
          the planet alike.
        </p>

        <h2 className="text-foreground">Our mission</h2>
        <p>
          To make certified-organic, sustainably grown food accessible to every household — delivered
          fresh, priced fairly, and sourced transparently. We want you to know exactly where your food
          comes from and feel good about every basket you fill.
        </p>

        <h2 className="text-foreground">Sourcing &amp; sustainability</h2>
        <p>
          We prioritize seasonal, local sourcing to cut food miles and support regional economies. Our
          packaging is recyclable or compostable wherever possible, and we offset the carbon footprint
          of every delivery. Sustainability isn&apos;t a marketing line for us — it&apos;s the reason we
          exist.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {VALUES.map((value) => (
          <div key={value.title} className="rounded-xl border p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <value.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{value.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-brand-50 p-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-brand-900">Taste the difference</h2>
        <p className="mt-2 text-muted-foreground">
          Browse our seasonal selection of certified-organic groceries.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Shop now</Link>
        </Button>
      </div>
    </div>
  );
}
