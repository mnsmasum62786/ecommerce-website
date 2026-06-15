"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/admin/image-uploader";
import { useToast } from "@/components/ui/use-toast";

// Cents-valued fields are held as integers; dollar inputs convert on the fly.
export type SettingsInitial = {
  storeName: string;
  logoUrl: string;
  currency: string;
  currencySymbol: string;
  supportEmail: string;
  supportPhone: string;
  addressLine: string;
  shippingFlatCents: number;
  freeShippingThreshold: number;
  taxRatePercent: number;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  announcement: string;
};

type FormState = Omit<
  SettingsInitial,
  "shippingFlatCents" | "freeShippingThreshold" | "taxRatePercent"
> & {
  shippingFlat: string; // dollars
  freeShippingThreshold: string; // dollars
  taxRatePercent: string;
};

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function toCents(dollars: string): number {
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    storeName: initial.storeName,
    logoUrl: initial.logoUrl,
    currency: initial.currency,
    currencySymbol: initial.currencySymbol,
    supportEmail: initial.supportEmail,
    supportPhone: initial.supportPhone,
    addressLine: initial.addressLine,
    shippingFlat: centsToDollars(initial.shippingFlatCents),
    freeShippingThreshold: centsToDollars(initial.freeShippingThreshold),
    taxRatePercent: String(initial.taxRatePercent),
    facebookUrl: initial.facebookUrl,
    instagramUrl: initial.instagramUrl,
    twitterUrl: initial.twitterUrl,
    announcement: initial.announcement,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.storeName.trim()) {
      toast({ title: "Store name required", variant: "destructive" });
      return;
    }
    const payload = {
      storeName: form.storeName,
      logoUrl: form.logoUrl || null,
      currency: form.currency,
      currencySymbol: form.currencySymbol,
      supportEmail: form.supportEmail,
      supportPhone: form.supportPhone || null,
      addressLine: form.addressLine || null,
      shippingFlatCents: toCents(form.shippingFlat),
      freeShippingThreshold: toCents(form.freeShippingThreshold),
      taxRatePercent: Number(form.taxRatePercent) || 0,
      facebookUrl: form.facebookUrl || null,
      instagramUrl: form.instagramUrl || null,
      twitterUrl: form.twitterUrl || null,
      announcement: form.announcement || null,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save settings.");
      }
      toast({ title: "Saved", description: "Store settings updated." });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Store name</Label>
            <Input
              id="s-name"
              value={form.storeName}
              onChange={(e) => set("storeName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <ImageUploader
              value={form.logoUrl ? [form.logoUrl] : []}
              onChange={(urls) => set("logoUrl", urls[0] ?? "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-announcement">Announcement bar</Label>
            <Textarea
              id="s-announcement"
              rows={2}
              value={form.announcement}
              placeholder="Shown in the top bar across the storefront."
              onChange={(e) => set("announcement", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Support email</Label>
              <Input
                id="s-email"
                type="email"
                value={form.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Support phone</Label>
              <Input
                id="s-phone"
                value={form.supportPhone}
                onChange={(e) => set("supportPhone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-address">Address</Label>
            <Input
              id="s-address"
              value={form.addressLine}
              onChange={(e) => set("addressLine", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing, shipping &amp; tax</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-currency">Currency code</Label>
              <Input
                id="s-currency"
                value={form.currency}
                placeholder="USD"
                onChange={(e) => set("currency", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-symbol">Currency symbol</Label>
              <Input
                id="s-symbol"
                value={form.currencySymbol}
                placeholder="$"
                onChange={(e) => set("currencySymbol", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-ship">Flat shipping ($)</Label>
              <Input
                id="s-ship"
                type="number"
                min={0}
                step={0.01}
                value={form.shippingFlat}
                onChange={(e) => set("shippingFlat", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-free">Free shipping over ($)</Label>
              <Input
                id="s-free"
                type="number"
                min={0}
                step={0.01}
                value={form.freeShippingThreshold}
                onChange={(e) => set("freeShippingThreshold", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-tax">Tax rate (%)</Label>
              <Input
                id="s-tax"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.taxRatePercent}
                onChange={(e) => set("taxRatePercent", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-fb">Facebook URL</Label>
            <Input
              id="s-fb"
              value={form.facebookUrl}
              placeholder="https://facebook.com/..."
              onChange={(e) => set("facebookUrl", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-ig">Instagram URL</Label>
            <Input
              id="s-ig"
              value={form.instagramUrl}
              placeholder="https://instagram.com/..."
              onChange={(e) => set("instagramUrl", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-tw">Twitter / X URL</Label>
            <Input
              id="s-tw"
              value={form.twitterUrl}
              placeholder="https://twitter.com/..."
              onChange={(e) => set("twitterUrl", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
