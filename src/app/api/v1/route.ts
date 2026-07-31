import { ok, preflight, withApiKey } from "@/lib/api-v1";

// ---------------------------------------------------------------------------
// /api/v1 — discovery document. Confirms the caller's key works and advertises
// every available resource so clients can be written against links, not
// hard-coded paths.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export const GET = withApiKey("READ", async (req, _ctx, key) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const v1 = `${baseUrl}/api/v1`;

  return ok({
    name: "Verdant Organic Market API",
    version: "1.0.0",
    documentation: `${v1}/docs`,
    authenticatedAs: {
      id: key.id,
      name: key.name,
      scopes: key.scopes,
    },
    resources: {
      products: `${v1}/products`,
      categories: `${v1}/categories`,
      orders: `${v1}/orders`,
      customers: `${v1}/customers`,
      inventory: `${v1}/inventory`,
      coupons: `${v1}/coupons`,
      store: `${v1}/store`,
    },
  });
});
