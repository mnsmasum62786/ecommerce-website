import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { CouponManager } from "@/components/admin/coupon-manager";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Create and manage discount codes customers can apply at checkout."
      />
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          type: c.type,
          value: c.value,
          minSpendCents: c.minSpendCents,
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
