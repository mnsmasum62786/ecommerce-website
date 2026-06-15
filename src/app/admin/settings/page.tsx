import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE } from "@/lib/settings";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const row = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  const s = row ?? DEFAULT_STORE;

  return (
    <div>
      <PageHeader
        title="Store settings"
        description="Branding, contact details, shipping, tax, and social links for your storefront."
      />
      <SettingsForm
        initial={{
          storeName: s.storeName,
          logoUrl: s.logoUrl ?? "",
          currency: s.currency,
          currencySymbol: s.currencySymbol,
          supportEmail: s.supportEmail,
          supportPhone: s.supportPhone ?? "",
          addressLine: s.addressLine ?? "",
          shippingFlatCents: s.shippingFlatCents,
          freeShippingThreshold: s.freeShippingThreshold,
          taxRatePercent: s.taxRatePercent,
          facebookUrl: s.facebookUrl ?? "",
          instagramUrl: s.instagramUrl ?? "",
          twitterUrl: s.twitterUrl ?? "",
          announcement: s.announcement ?? "",
        }}
      />
    </div>
  );
}
