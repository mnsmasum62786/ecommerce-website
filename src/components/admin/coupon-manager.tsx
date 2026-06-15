"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { DiscountType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice, formatDate } from "@/lib/utils";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  minSpendCents: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
};

type FormState = {
  code: string;
  description: string;
  type: DiscountType;
  // Display value: for PERCENT this is the percent; for FIXED this is dollars.
  value: string;
  minSpend: string; // dollars
  maxUses: string; // optional int
  expiresAt: string; // yyyy-mm-dd
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  type: DiscountType.PERCENT,
  value: "",
  minSpend: "",
  maxUses: "",
  expiresAt: "",
  isActive: true,
};

function valueDisplay(c: CouponRow): string {
  return c.type === DiscountType.PERCENT ? `${c.value}%` : formatPrice(c.value);
}

function toCents(dollars: string): number {
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(c: CouponRow) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: c.type === DiscountType.PERCENT ? String(c.value) : (c.value / 100).toFixed(2),
      minSpend: c.minSpendCents ? (c.minSpendCents / 100).toFixed(2) : "",
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      isActive: c.isActive,
    });
    setDialogOpen(true);
  }

  async function submit() {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast({ title: "Code required", variant: "destructive" });
      return;
    }
    const rawValue = Number(form.value);
    if (!Number.isFinite(rawValue) || rawValue < 0) {
      toast({ title: "Invalid value", description: "Enter a valid discount value.", variant: "destructive" });
      return;
    }
    if (form.type === DiscountType.PERCENT && rawValue > 100) {
      toast({ title: "Invalid value", description: "Percentage cannot exceed 100%.", variant: "destructive" });
      return;
    }

    const payload = {
      code,
      description: form.description.trim() || null,
      type: form.type,
      value: form.type === DiscountType.PERCENT ? Math.round(rawValue) : toCents(form.value),
      minSpendCents: form.minSpend ? toCents(form.minSpend) : 0,
      maxUses: form.maxUses ? Math.round(Number(form.maxUses)) : null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save coupon.");
      }
      toast({ title: editingId ? "Coupon updated" : "Coupon created", description: code });
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: CouponRow) {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete coupon.");
      }
      toast({ title: "Coupon deleted", description: c.code });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {coupons.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No coupons yet. Create your first discount code.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min. spend</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-mono font-semibold">{c.code}</span>
                      {c.description && (
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      )}
                    </TableCell>
                    <TableCell>{valueDisplay(c)}</TableCell>
                    <TableCell>
                      {c.minSpendCents > 0 ? formatPrice(c.minSpendCents) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.usedCount}/{c.maxUses != null ? c.maxUses : "∞"}
                    </TableCell>
                    <TableCell>{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</TableCell>
                    <TableCell>
                      {c.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === c.id}
                          onClick={() => remove(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "New coupon"}</DialogTitle>
            <DialogDescription>
              Percentage discounts apply a share of the subtotal; fixed discounts subtract a set
              amount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Code</Label>
              <Input
                id="c-code"
                value={form.code}
                placeholder="WELCOME10"
                className="font-mono uppercase"
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Description</Label>
              <Input
                id="c-desc"
                value={form.description}
                placeholder="10% off your first order"
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as DiscountType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DiscountType.PERCENT}>Percentage</SelectItem>
                    <SelectItem value={DiscountType.FIXED}>Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-value">
                  {form.type === DiscountType.PERCENT ? "Percent (0–100)" : "Amount ($)"}
                </Label>
                <Input
                  id="c-value"
                  type="number"
                  min={0}
                  max={form.type === DiscountType.PERCENT ? 100 : undefined}
                  step={form.type === DiscountType.PERCENT ? 1 : 0.01}
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-min">Minimum spend ($)</Label>
                <Input
                  id="c-min"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.minSpend}
                  placeholder="0.00"
                  onChange={(e) => setForm((p) => ({ ...p, minSpend: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-max">Max uses (optional)</Label>
                <Input
                  id="c-max"
                  type="number"
                  min={1}
                  step={1}
                  value={form.maxUses}
                  placeholder="Unlimited"
                  onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-exp">Expiry date (optional)</Label>
              <Input
                id="c-exp"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive coupons cannot be redeemed.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
