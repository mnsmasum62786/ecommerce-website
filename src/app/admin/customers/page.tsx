import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          where: { paymentStatus: "PAID" },
          select: { totalCents: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    totalSpentCents: c.orders.reduce((sum, o) => sum + o.totalCents, 0),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  }

  return (
    <div>
      <PageHeader title="Customers" description={`${total} registered customer(s).`} />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name or email..."
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-lg border bg-card">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No customers found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.orderCount}</TableCell>
                  <TableCell>{formatPrice(c.totalSpentCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/customers/${c.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
