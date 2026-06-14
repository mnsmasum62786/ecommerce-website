"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, ImageIcon } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type BulkProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  priceCents: number;
  stock: number;
  lowStockAt: number;
  isActive: boolean;
};

type BulkAction = "activate" | "deactivate" | "delete";

export function ProductBulkTable({ products }: { products: BulkProductRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: BulkAction) {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Bulk action failed.");
      }
      const data = await res.json();
      toast({ title: `${action} applied to ${data.count} product(s).` });
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
        No products found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk("activate")}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk("deactivate")}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => runBulk("delete")}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-14"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const low = p.stock <= p.lowStockAt;
              return (
                <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                  <TableCell>{formatPrice(p.priceCents)}</TableCell>
                  <TableCell>
                    <span className={low ? "font-semibold text-destructive" : ""}>
                      {p.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "success" : "outline"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/products/${p.id}`}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
