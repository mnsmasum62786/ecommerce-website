import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Verdant Organic Market and purchases made through it.",
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-serif text-4xl font-bold text-brand-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

      <div className="prose prose-neutral mt-8 max-w-none text-muted-foreground">
        <p>
          Welcome to Verdant Organic Market. By accessing or using our website and placing orders, you
          agree to these Terms of Service. Please read them carefully.
        </p>

        <h2 className="text-foreground">Using our site</h2>
        <p>
          You agree to use the site lawfully and not to misuse it, interfere with its operation, or
          attempt to access it in any unauthorized manner. You are responsible for keeping your account
          credentials secure.
        </p>

        <h2 className="text-foreground">Products and pricing</h2>
        <p>
          We strive to describe our products and prices accurately. However, errors may occur. We
          reserve the right to correct any errors and to change prices, descriptions, or availability at
          any time without notice. All prices are shown in U.S. dollars.
        </p>

        <h2 className="text-foreground">Orders</h2>
        <p>
          Your order is an offer to purchase. We may accept or decline it, and we may cancel an order if
          a product is unavailable, if there is a pricing error, or if we suspect fraud. If we cancel a
          paid order, we will refund you in full.
        </p>

        <h2 className="text-foreground">Payment</h2>
        <p>
          Payment is due at checkout for card orders. For Cash on Delivery, payment is due when your
          order is delivered. By submitting an order, you authorize us to charge the applicable amount
          using your selected payment method.
        </p>

        <h2 className="text-foreground">Shipping and returns</h2>
        <p>
          Shipping and return terms are described on our{" "}
          <a href="/shipping-returns" className="text-brand-600">
            Shipping &amp; Returns
          </a>{" "}
          page and are incorporated into these terms.
        </p>

        <h2 className="text-foreground">Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Verdant Organic Market is not liable for any indirect,
          incidental, or consequential damages arising from your use of the site or products purchased
          through it.
        </p>

        <h2 className="text-foreground">Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after changes take
          effect constitutes acceptance of the revised terms.
        </p>

        <h2 className="text-foreground">Contact</h2>
        <p>
          Questions about these terms? Reach us through our{" "}
          <a href="/contact" className="text-brand-600">
            contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}
