import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ScriptInjector } from "@/components/scripts/script-injector";
import { getStoreSettings } from "@/lib/settings";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreSettings();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: `${store.storeName} — Fresh Certified-Organic Groceries`,
      template: `%s · ${store.storeName}`,
    },
    description:
      "Shop fresh, certified-organic fruits, vegetables, dairy, pantry staples and more. Sustainably sourced and delivered to your door.",
    keywords: ["organic food", "organic grocery", "natural food", "fresh produce", "organic delivery"],
    openGraph: {
      type: "website",
      title: `${store.storeName} — Fresh Certified-Organic Groceries`,
      description: "Sustainably sourced, certified-organic groceries delivered to your door.",
      siteName: store.storeName,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        {/* Custom Script Manager: head slot (GTM, GA4, Meta Pixel, custom). */}
        <ScriptInjector slot="head" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Custom Script Manager: body-start slot (GTM noscript, etc.). */}
        <ScriptInjector slot="bodyStart" />
        <Providers>{children}</Providers>
        <Toaster />
        {/* Custom Script Manager: footer slot. */}
        <ScriptInjector slot="footer" />
      </body>
    </html>
  );
}
