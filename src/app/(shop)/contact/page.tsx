import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/storefront/contact-form";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Verdant Organic Market team. We're here to help.",
};

export default async function ContactPage() {
  const store = await getStoreSettings();

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="font-serif text-4xl font-bold text-brand-900">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        Have a question about an order, a product, or anything else? We&apos;d love to hear from you.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          <ContactDetail icon={Mail} label="Email">
            <a href={`mailto:${store.supportEmail}`} className="text-brand-600 hover:underline">
              {store.supportEmail}
            </a>
          </ContactDetail>
          <ContactDetail icon={Phone} label="Phone">
            <a href={`tel:${store.supportPhone}`} className="hover:underline">
              {store.supportPhone}
            </a>
          </ContactDetail>
          {store.addressLine && (
            <ContactDetail icon={MapPin} label="Address">
              {store.addressLine}
            </ContactDetail>
          )}
          <ContactDetail icon={Clock} label="Response time">
            We typically respond within 1 business day.
          </ContactDetail>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

function ContactDetail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
