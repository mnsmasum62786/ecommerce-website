"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StockEditor({
  productId,
  stock,
  lowStockAt,
}: {
  productId: string;
  stock: number;
  lowStockAt: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [stockValue, setStockValue] = useState(String(stock));
  const [lowValue, setLowValue] = useState(String(lowStockAt));
  const [saving, setSaving] = useState(false);

  const dirty = Number(stockValue) !== stock || Number(lowValue) !== lowStockAt;

  async function save() {
    const nextStock = Number(stockValue);
    const nextLow = Number(lowValue);
    if (!Number.isInteger(nextStock) || nextStock < 0 || !Number.isInteger(nextLow) || nextLow < 0) {
      toast({ title: "Enter valid non-negative whole numbers.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: nextStock, lowStockAt: nextLow }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update stock.");
      }
      toast({ title: "Stock updated." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        value={stockValue}
        onChange={(e) => setStockValue(e.target.value)}
        className="h-9 w-20"
        aria-label="Stock"
      />
      <Input
        type="number"
        min="0"
        value={lowValue}
        onChange={(e) => setLowValue(e.target.value)}
        className="h-9 w-20"
        aria-label="Low stock threshold"
      />
      <Button size="sm" variant="outline" onClick={save} disabled={!dirty || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save
      </Button>
    </div>
  );
}
