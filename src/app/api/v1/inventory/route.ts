import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ok,
  fail,
  preflight,
  withApiKey,
  readPagination,
  paginationMeta,
  parseBody,
} from "@/lib/api-v1";

// ---------------------------------------------------------------------------
// /api/v1/inventory — stock-keeping view over the catalog.
//   GET  (READ)  paginated stock levels + a store-wide summary
//   POST (WRITE) bulk stock adjustments (absolute set and/or relative delta)
//
// Scope: this endpoint reports on ACTIVE products only — inactive/archived
// products are not sellable, so counting them would distort the low-stock and
// out-of-stock signals merchants act on.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const STATUSES = ["all", "low", "out", "in_stock"] as const;
type Status = (typeof STATUSES)[number];

function money(cents: number) {
  return { cents, amount: (cents / 100).toFixed(2) };
}

/** Fields needed to render an inventory row. */
const inventorySelect = {
  id: true,
  name: true,
  sku: true,
  slug: true,
  stock: true,
  lowStockAt: true,
  priceCents: true,
} satisfies Prisma.ProductSelect;

type InventoryRow = Prisma.ProductGetPayload<{ select: typeof inventorySelect }>;

function serializeInventoryRow(p: InventoryRow) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    slug: p.slug,
    stock: p.stock,
    lowStockThreshold: p.lowStockAt,
    isLowStock: p.stock > 0 && p.stock <= p.lowStockAt,
    inStock: p.stock > 0,
    price: money(p.priceCents),
  };
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey("READ", async (req) => {
  const url = new URL(req.url);
  const pagination = readPagination(url);
  const params = url.searchParams;

  const rawStatus = params.get("status");
  const status: Status =
    rawStatus && (STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as Status) : "all";

  // Base scope: active products, optionally narrowed by a name/SKU search.
  const base: Prisma.ProductWhereInput = { isActive: true };
  const search = params.get("search")?.trim();
  if (search) {
    base.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  // "Low stock" compares two columns (stock <= lowStockAt), which Prisma's
  // `where` cannot express. Rather than dropping to $queryRaw (and hand-writing
  // the search/pagination SQL), we pull just the two integer columns for the
  // scoped set, evaluate the comparison in JS, and reuse the resulting id list
  // both for the `status=low` filter and for the summary counter. The payload
  // is two ints per product, so this stays cheap for catalog-sized data.
  const gauge = await prisma.product.findMany({
    where: base,
    select: { id: true, stock: true, lowStockAt: true },
  });
  const lowStockIds = gauge.filter((r) => r.stock > 0 && r.stock <= r.lowStockAt).map((r) => r.id);

  // Once the low-stock ids are known, every status is an ordinary DB filter, so
  // pagination and counting stay in the database for all four cases.
  const where: Prisma.ProductWhereInput =
    status === "low"
      ? { ...base, id: { in: lowStockIds } }
      : status === "out"
        ? { ...base, stock: { lte: 0 } }
        : status === "in_stock"
          ? { ...base, stock: { gt: 0 } }
          : base;

  const [rows, total, totalSkus, outOfStock] = await Promise.all([
    prisma.product.findMany({
      where,
      select: inventorySelect,
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({ where }),
    // Summary counters describe the whole scoped set (search applies, `status`
    // does not) so clients can show tab badges alongside a filtered list.
    prisma.product.count({ where: base }),
    prisma.product.count({ where: { ...base, stock: { lte: 0 } } }),
  ]);

  return ok(rows.map(serializeInventoryRow), {
    meta: {
      ...paginationMeta(total, pagination),
      summary: { totalSkus, lowStock: lowStockIds.length, outOfStock },
    },
  });
});

// --- POST -------------------------------------------------------------------

const adjustmentSchema = z
  .object({
    productId: z.string().min(1),
    // Absolute stock level.
    stock: z.number().int().nonnegative().optional(),
    // Relative delta; may be negative (result is clamped at 0).
    adjust: z.number().int().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
  })
  .refine(
    (a) => a.stock !== undefined || a.adjust !== undefined || a.lowStockThreshold !== undefined,
    { message: "Provide at least one of stock, adjust or lowStockThreshold." },
  );

const bulkSchema = z.object({
  adjustments: z.array(adjustmentSchema).min(1).max(200),
});

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, bulkSchema);
  if (!parsed.ok) return parsed.response;
  const { adjustments } = parsed.data;

  // Validate every referenced product BEFORE mutating anything, so a bad id in
  // the middle of a batch cannot leave a half-applied adjustment behind.
  const ids = Array.from(new Set(adjustments.map((a) => a.productId)));
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundIds = new Set(found.map((p) => p.id));
  const missing = ids.find((id) => !foundIds.has(id));
  if (missing) {
    return fail("invalid_product", `Product ${missing} not found.`, 422);
  }

  const items = await prisma.$transaction(
    async (tx) => {
      const results: { id: string; stock: number; lowStockThreshold: number }[] = [];

      // Applied in payload order so repeated ids compose predictably.
      for (const adjustment of adjustments) {
        // Read the current row inside the transaction: a relative `adjust` has
        // to be clamped at 0, and clamping requires knowing the current level.
        const current = await tx.product.findUniqueOrThrow({
          where: { id: adjustment.productId },
          select: { stock: true, lowStockAt: true },
        });

        // `stock` sets the absolute level; `adjust` is then applied on top of
        // it (or on top of the current level when `stock` was omitted).
        let nextStock = adjustment.stock ?? current.stock;
        if (adjustment.adjust !== undefined) {
          nextStock = Math.max(0, nextStock + adjustment.adjust);
        }

        const nextThreshold = adjustment.lowStockThreshold ?? current.lowStockAt;

        const updated = await tx.product.update({
          where: { id: adjustment.productId },
          data: { stock: nextStock, lowStockAt: nextThreshold },
          select: { id: true, stock: true, lowStockAt: true },
        });

        results.push({
          id: updated.id,
          stock: updated.stock,
          lowStockThreshold: updated.lowStockAt,
        });
      }

      return results;
    },
    // A 200-item batch is ~400 sequential statements; the 5s default is tight.
    { maxWait: 10_000, timeout: 30_000 },
  );

  return ok({ updated: items.length, items });
});
