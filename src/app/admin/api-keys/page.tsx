import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ApiKeyManager, type ApiKeyRow } from "@/components/admin/api-key-manager";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  let keys: ApiKeyRow[] = [];
  try {
    const rows = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
    keys = rows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes as string[],
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      requestCount: k.requestCount,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  } catch {
    // Table may not exist yet before the schema is applied.
    keys = [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shop.webanalyticssolution.com";

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Issue keys so third-party platforms can manage your store through the REST API."
      />
      <ApiKeyManager initialKeys={keys} baseUrl={baseUrl} />
    </div>
  );
}
