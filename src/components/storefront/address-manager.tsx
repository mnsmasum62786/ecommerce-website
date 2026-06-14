"use client";

import * as React from "react";
import { Loader2, Trash2, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export type AddressData = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const EMPTY_FORM = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
};

export function AddressManager({ initialAddresses }: { initialAddresses: AddressData[] }) {
  const { toast } = useToast();
  const [addresses, setAddresses] = React.useState<AddressData[]>(initialAddresses);
  const [showForm, setShowForm] = React.useState(initialAddresses.length === 0);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [isDefault, setIsDefault] = React.useState(initialAddresses.length === 0);
  const [saving, setSaving] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function refresh() {
    const res = await fetch("/api/account/addresses");
    if (res.ok) {
      const data = await res.json();
      setAddresses(data.addresses);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDefault }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Could not save address",
          description: data.error ?? "Please try again.",
        });
        return;
      }
      toast({ title: "Address saved" });
      setForm(EMPTY_FORM);
      setIsDefault(false);
      setShowForm(false);
      await refresh();
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Could not delete address" });
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Address removed" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "PATCH" });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Could not update default" });
        return;
      }
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  {address.label && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      {address.label}
                    </p>
                  )}
                  <p className="font-medium">{address.fullName}</p>
                </div>
                {address.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                    <Star className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
              <address className="mt-2 not-italic text-sm text-muted-foreground">
                <span className="block">{address.line1}</span>
                {address.line2 && <span className="block">{address.line2}</span>}
                <span className="block">
                  {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                </span>
                <span className="block">{address.country}</span>
                <span className="mt-1 block">{address.phone}</span>
              </address>
              <div className="mt-4 flex gap-2">
                {!address.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                    disabled={busyId === address.id}
                  >
                    Set default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  disabled={busyId === address.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-4 rounded-xl border p-6">
          <h2 className="font-semibold">Add a new address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label (optional)">
              <Input
                value={form.label}
                onChange={(e) => update("label", e.target.value)}
                placeholder="Home, Work…"
              />
            </Field>
            <Field label="Full name" required>
              <Input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </Field>
            <Field label="Phone" required>
              <Input required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Country" required>
              <Input required value={form.country} onChange={(e) => update("country", e.target.value)} />
            </Field>
            <Field label="Address line 1" required className="sm:col-span-2">
              <Input required value={form.line1} onChange={(e) => update("line1", e.target.value)} />
            </Field>
            <Field label="Address line 2" className="sm:col-span-2">
              <Input value={form.line2} onChange={(e) => update("line2", e.target.value)} />
            </Field>
            <Field label="City" required>
              <Input required value={form.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="State / Province">
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
            </Field>
            <Field label="Postal code" required>
              <Input
                required
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Set as default address
          </label>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save address"
              )}
            </Button>
            {addresses.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add address
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
