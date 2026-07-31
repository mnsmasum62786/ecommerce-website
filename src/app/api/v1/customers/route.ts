import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
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
import { serializeCustomer } from "@/lib/api-serializers";

// ---------------------------------------------------------------------------
// /api/v1/customers — list and create customer accounts (role = CUSTOMER).
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Include so responses always satisfy serializeCustomer's payload type. */
const customerInclude = {
  addresses: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserInclude;

const SORTS: Record<string, Prisma.UserOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name_asc: { name: "asc" },
};

/**
 * Total lifetime spend per customer, computed in ONE grouped query for the
 * whole page rather than N queries.
 */
async function totalSpentByUser(userIds: string[]): Promise<Map<string, number>> {
  const spend = new Map<string, number>();
  if (userIds.length === 0) return spend;

  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, paymentStatus: "PAID" },
    _sum: { totalCents: true },
  });

  for (const row of grouped) {
    if (row.userId) spend.set(row.userId, row._sum.totalCents ?? 0);
  }
  return spend;
}

// --- GET /api/v1/customers --------------------------------------------------

export const GET = withApiKey("READ", async (req) => {
  const url = new URL(req.url);
  const pagination = readPagination(url);

  const where: Prisma.UserWhereInput = { role: Role.CUSTOMER };

  const email = url.searchParams.get("email")?.trim();
  if (email) where.email = { equals: email, mode: "insensitive" };

  const search = url.searchParams.get("search")?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy = SORTS[url.searchParams.get("sort") ?? "newest"] ?? SORTS.newest;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: customerInclude,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ]);

  const spend = await totalSpentByUser(users.map((u) => u.id));

  return ok(
    users.map((u) => serializeCustomer(u, spend.get(u.id) ?? 0)),
    { meta: paginationMeta(total, pagination) },
  );
});

// --- POST /api/v1/customers -------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email(),
  // Optional: guest-style customers may have no login credentials at all.
  password: z.string().min(8).optional(),
});

export const POST = withApiKey("WRITE", async (req) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return fail("email_exists", "A customer with that email already exists.", 409);
  }

  const created = await prisma.user.create({
    data: {
      name: data.name ?? null,
      email,
      passwordHash: data.password ? await bcrypt.hash(data.password, 10) : null,
      role: Role.CUSTOMER,
    },
    include: customerInclude,
  });

  return ok(serializeCustomer(created, 0), { status: 201 });
});
