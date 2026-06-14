import Link from "next/link";
import { Leaf, Facebook, Instagram, Twitter } from "lucide-react";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { FOOTER_LINKS } from "@/lib/nav";
import { getStoreSettings } from "@/lib/settings";

export async function SiteFooter() {
  const store = await getStoreSettings();
  return (
    <footer className="mt-16 border-t bg-brand-50">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-serif text-lg font-bold text-brand-700">
              <Leaf className="h-5 w-5 text-brand-500" />
              {store.storeName}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Certified-organic groceries, sustainably sourced and delivered fresh to your door.
            </p>
            <div className="mt-4 flex gap-3">
              {store.facebookUrl && (
                <a href={store.facebookUrl} aria-label="Facebook" className="text-brand-600 hover:text-brand-800">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {store.instagramUrl && (
                <a href={store.instagramUrl} aria-label="Instagram" className="text-brand-600 hover:text-brand-800">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {store.twitterUrl && (
                <a href={store.twitterUrl} aria-label="Twitter" className="text-brand-600 hover:text-brand-800">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Get in touch</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{store.supportEmail}</li>
              <li>{store.supportPhone}</li>
              {store.addressLine && <li>{store.addressLine}</li>}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Join our newsletter</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              Seasonal recipes, new arrivals, and members-only offers.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {store.storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
