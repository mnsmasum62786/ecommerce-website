"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/image-uploader";

export type ProductFormCategory = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  priceDollars: string;
  compareAtDollars: string;
  sku: string;
  stock: string;
  lowStockAt: string;
  unit: string;
  categoryId: string;
  isOrganic: boolean;
  certification: string;
  tags: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  images: string[];
};

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  shortDesc: "",
  description: "",
  priceDollars: "",
  compareAtDollars: "",
  sku: "",
  stock: "0",
  lowStockAt: "5",
  unit: "each",
  categoryId: "",
  isOrganic: true,
  certification: "",
  tags: "",
  isFeatured: false,
  isBestSeller: false,
  isActive: true,
  images: [],
};

/** Convert a dollar string to integer cents, or null if blank/invalid. */
function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: ProductFormCategory[];
  initial?: Partial<ProductFormValues>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ProductFormValues>({ ...EMPTY, ...initial });
  // Track whether the user has hand-edited the slug so auto-fill doesn't clobber it.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(values.id);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onNameChange(name: string) {
    setValues((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!values.name.trim()) {
      toast({ title: "Name is required.", variant: "destructive" });
      return;
    }
    if (!values.description.trim()) {
      toast({ title: "Description is required.", variant: "destructive" });
      return;
    }
    if (!values.categoryId) {
      toast({ title: "Please select a category.", variant: "destructive" });
      return;
    }
    const priceCents = dollarsToCents(values.priceDollars);
    if (priceCents === null) {
      toast({ title: "Enter a valid price.", variant: "destructive" });
      return;
    }
    const compareAtCents = values.compareAtDollars.trim()
      ? dollarsToCents(values.compareAtDollars)
      : null;
    if (values.compareAtDollars.trim() && compareAtCents === null) {
      toast({ title: "Enter a valid compare-at price.", variant: "destructive" });
      return;
    }

    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim() || undefined,
      shortDesc: values.shortDesc.trim() || null,
      description: values.description.trim(),
      priceCents,
      compareAtCents,
      sku: values.sku.trim() || null,
      stock: Number(values.stock) || 0,
      lowStockAt: Number(values.lowStockAt) || 0,
      unit: values.unit.trim() || "each",
      categoryId: values.categoryId,
      isOrganic: values.isOrganic,
      certification: values.certification.trim() || null,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isFeatured: values.isFeatured,
      isBestSeller: values.isBestSeller,
      isActive: values.isActive,
      images: values.images,
    };

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${values.id}` : "/api/admin/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product.");
      }
      toast({ title: isEdit ? "Product updated." : "Product created." });
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Organic Hass Avocados"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                placeholder="organic-hass-avocados"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short description</Label>
              <Input
                id="shortDesc"
                value={values.shortDesc}
                onChange={(e) => set("shortDesc", e.target.value)}
                placeholder="Creamy, ripe and ready to eat."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={6}
                placeholder="Full product description..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              value={values.images}
              onChange={(urls) => set("images", urls)}
              multiple
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing &amp; inventory</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={values.priceDollars}
                onChange={(e) => set("priceDollars", e.target.value)}
                placeholder="4.99"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compareAt">Compare-at ($)</Label>
              <Input
                id="compareAt"
                type="number"
                step="0.01"
                min="0"
                value={values.compareAtDollars}
                onChange={(e) => set("compareAtDollars", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={values.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={values.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="each / lb / bunch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={values.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockAt">Low-stock threshold</Label>
              <Input
                id="lowStockAt"
                type="number"
                min="0"
                value={values.lowStockAt}
                onChange={(e) => set("lowStockAt", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={values.categoryId}
                onValueChange={(v) => set("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={values.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="Comma separated"
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Organic product"
              checked={values.isOrganic}
              onChange={(v) => set("isOrganic", v)}
            />
            <div className="space-y-2">
              <Label htmlFor="certification">Certification</Label>
              <Input
                id="certification"
                value={values.certification}
                onChange={(e) => set("certification", e.target.value)}
                placeholder="USDA Organic"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Active"
              checked={values.isActive}
              onChange={(v) => set("isActive", v)}
            />
            <ToggleRow
              label="Featured"
              checked={values.isFeatured}
              onChange={(v) => set("isFeatured", v)}
            />
            <ToggleRow
              label="Best seller"
              checked={values.isBestSeller}
              onChange={(v) => set("isBestSeller", v)}
            />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products")}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
