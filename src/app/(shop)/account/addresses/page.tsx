import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddressManager, type AddressData } from "@/components/storefront/address-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Saved Addresses" };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/addresses");
  }

  const rows = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const addresses: AddressData[] = rows.map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    isDefault: a.isDefault,
  }));

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-brand-900">Saved addresses</h1>
        <Link href="/account" className="text-sm font-medium text-brand-600 hover:underline">
          Back to account
        </Link>
      </div>

      <AddressManager initialAddresses={addresses} />
    </div>
  );
}
