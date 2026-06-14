import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Verdant Organic Market collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-serif text-4xl font-bold text-brand-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

      <div className="prose prose-neutral mt-8 max-w-none text-muted-foreground">
        <p>
          Verdant Organic Market (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects
          your privacy. This policy explains what information we collect, how we use it, and the
          choices you have.
        </p>

        <h2 className="text-foreground">Information we collect</h2>
        <p>
          We collect information you provide directly — such as your name, email address, phone
          number, shipping address, and order details — when you create an account, place an order, or
          contact us. We also collect limited technical data (such as device and usage information) to
          operate and improve the site.
        </p>

        <h2 className="text-foreground">How we use your information</h2>
        <ul>
          <li>To process and deliver your orders and send order-related communications.</li>
          <li>To provide customer support and respond to your inquiries.</li>
          <li>To improve our products, services, and website experience.</li>
          <li>To send marketing emails where you have opted in (you can unsubscribe anytime).</li>
        </ul>

        <h2 className="text-foreground">Payment information</h2>
        <p>
          Card payments are processed securely by Stripe. We do not store your full card number on our
          servers. Stripe&apos;s handling of your payment data is governed by its own privacy policy.
        </p>

        <h2 className="text-foreground">Sharing your information</h2>
        <p>
          We do not sell your personal information. We share data only with trusted service providers
          (such as payment processors, delivery partners, and email providers) who help us operate the
          business, and only as needed to provide our services.
        </p>

        <h2 className="text-foreground">Cookies</h2>
        <p>
          We use cookies and similar technologies to keep your cart, remember your preferences, and
          understand how the site is used. You can control cookies through your browser settings.
        </p>

        <h2 className="text-foreground">Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal information by
          contacting us. We will respond in accordance with applicable law.
        </p>

        <h2 className="text-foreground">Contact us</h2>
        <p>
          If you have questions about this policy, please reach out through our{" "}
          <a href="/contact" className="text-brand-600">
            contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}
