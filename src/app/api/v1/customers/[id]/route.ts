import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, preflight, withApiKey, parseBody } from "@/lib/api-v1";
import { serializeCustomer } from "@/lib/api-serializers";

// ---------------------------------------------------------------------------
// /api/v1/customers/:id — the identifier may be the user id OR their email
// address (anything containing "@" is treated as an email).
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: { id: string } };

const customerInclude = {
  addresses: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserInclude;

type CustomerRecord = Prisma.UserGetPayload<{ include: typeof customerInclude }>;

function money(cents: number) {
  return { cents, amount: (cents / 100).toFixed(2) };
}

/** Resolve a customer by id, or by email when the param looks like one. */
async function findCustomer(identifier: string): Promise<CustomerRecord | null> {
  if (identifier.includes("@")) {
    return prisma.user.findUnique({
      where: { email: identifier.toLowerCase() },
      include: customerInclude,
    });
  }
  return prisma.user.findUnique({ where: { id: identifier }, include: customerInclude });
}

/** Lifetime spend = sum of PAID order totals for this customer. */
async function totalSpent(userId: string): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: { userId, paymentStatus: "PAID" },
    _sum: { totalCents: true },
  });
  return agg._sum.totalCents ?? 0;
}

// --- GET --------------------------------------------------------------------

export const GET = withApiKey<Ctx>("READ", async (_req, { params }) => {
  const user = await findCustomer(params.id);
  if (!user) return notFound("Customer");

  const [spent, orders] = await Promise.all([
    totalSpent(user.id),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
      },
    }),
  ]);

  const recentOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: money(o.totalCents),
    createdAt: o.createdAt.toISOString(),
  }));

  return ok({ ...serializeCustomer(user, spent), recentOrders });
});

// --- PATCH ------------------------------------------------------------------

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(),
});

export const PATCH = withApiKey<Ctx>("WRITE", async (req, { params }) => {
  const user = await findCustomer(params.id);
  if (!user) return notFound("Customer");

  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return fail("empty_update", "Provide at least one field to update.", 422);
  }

  const update: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) update.name = data.name;

  if (data.email !== undefined) {
    const email = data.email.toLowerCase();
    if (email !== user.email) {
      const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (clash) return fail("email_exists", "A customer with that email already exists.", 409);
    }
    update.email = email;
  }

  if (data.password !== undefined) {
    update.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: update,
    include: customerInclude,
  });

  return ok(serializeCustomer(updated, await totalSpent(updated.id)));
});

// --- DELETE -----------------------------------------------------------------

export const DELETE = withApiKey<Ctx>("WRITE", async (_req, { params }) => {
  const user = await findCustomer(params.id);
  if (!user) return notFound("Customer");

  // Order.userId is onDelete: SetNull, so the order history is preserved and
  // simply becomes a guest order.
  await prisma.user.delete({ where: { id: user.id } });

  return ok({ id: user.id, deleted: true });
});
