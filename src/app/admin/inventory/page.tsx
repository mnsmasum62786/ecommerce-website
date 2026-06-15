import { Boxes, AlertTriangle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StockEditor } from "@/components/admin/stock-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { stock: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      lowStockAt: true,
    },
  });

  const totalSkus = products.length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track and update stock levels for active products."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Boxes} label="Active SKUs" value={totalSkus} />
        <StatCard icon={AlertTriangle} label="Low stock" value={lowStock} hint="At or below threshold" />
        <StatCard icon={XCircle} label="Out of stock" value={outOfStock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock levels</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active products.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock / Low-stock threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const out = p.stock <= 0;
                  const low = !out && p.stock <= p.lowStockAt;
                  return (
                    <TableRow
                      key={p.id}
                      className={out ? "bg-destructive/5" : low ? "bg-amber-50" : undefined}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                      <TableCell>
                        {out ? (
                          <Badge variant="destructive">Out</Badge>
                        ) : low ? (
                          <Badge variant="warning">Low</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StockEditor
                          productId={p.id}
                          stock={p.stock}
                          lowStockAt={p.lowStockAt}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
