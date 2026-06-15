"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Send,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDateTime } from "@/lib/utils";

export type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  deliveryCount: number;
};

export type DeliveryRow = {
  id: string;
  event: string;
  webhookName: string;
  orderNumber: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  responseCode: number | null;
  attempts: number;
  createdAt: string;
};

type FormState = {
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  url: "",
  secret: "",
  events: [],
  isActive: true,
};

/** Generate a random hex secret (32 bytes / 64 hex chars) in the browser. */
function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function statusVariant(status: DeliveryRow["status"]) {
  if (status === "SUCCESS") return "success" as const;
  if (status === "FAILED") return "destructive" as const;
  return "secondary" as const;
}

export function WebhookManager({
  webhooks,
  deliveries,
  events,
}: {
  webhooks: WebhookRow[];
  deliveries: DeliveryRow[];
  events: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, secret: generateSecret() });
    setDialogOpen(true);
  }

  function openEdit(w: WebhookRow) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      url: w.url,
      secret: w.secret,
      events: [...w.events],
      isActive: w.isActive,
    });
    setDialogOpen(true);
  }

  function toggleEvent(event: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      events: checked
        ? [...prev.events, event]
        : prev.events.filter((e) => e !== event),
    }));
  }

  async function submit() {
    if (!form.name.trim() || !form.url.trim() || !form.secret.trim()) {
      toast({
        title: "Missing details",
        description: "Name, URL and secret are required.",
        variant: "destructive",
      });
      return;
    }
    if (form.events.length === 0) {
      toast({
        title: "No events selected",
        description: "Select at least one event to subscribe to.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/webhooks/${editingId}` : "/api/admin/webhooks";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save webhook.");
      }
      toast({
        title: editingId ? "Webhook updated" : "Webhook created",
        description: form.name,
      });
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

  async function toggleActive(w: WebhookRow, isActive: boolean) {
    setBusyId(w.id);
    try {
      const res = await fetch(`/api/admin/webhooks/${w.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update webhook.");
      }
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not update",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function test(w: WebhookRow) {
    setBusyId(w.id);
    try {
      const res = await fetch(`/api/admin/webhooks/${w.id}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Test request failed.");
      }
      const ok = data.status === "SUCCESS";
      toast({
        title: ok ? "Test delivered" : "Test failed",
        description: `Endpoint responded with ${data.responseCode ?? "no response"}.`,
        variant: ok ? undefined : "destructive",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Test failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(w: WebhookRow) {
    if (!window.confirm(`Delete webhook "${w.name}"? This also removes its delivery history.`)) {
      return;
    }
    setBusyId(w.id);
    try {
      const res = await fetch(`/api/admin/webhooks/${w.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete webhook.");
      }
      toast({ title: "Webhook deleted", description: w.name });
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          Each delivery is signed with HMAC-SHA256 and sent in the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-Verdant-Signature</code>{" "}
          header so receivers can verify authenticity.
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add webhook
        </Button>
      </div>

      {/* Webhook list */}
      <div className="space-y-3">
        {webhooks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No webhooks configured yet. Add one to start receiving order events.
            </CardContent>
          </Card>
        )}

        {webhooks.map((w) => (
          <Card key={w.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{w.name}</h3>
                    {w.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="break-all font-mono text-xs text-muted-foreground">{w.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.deliveryCount} {w.deliveryCount === 1 ? "delivery" : "deliveries"} logged
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={w.isActive}
                    disabled={busyId === w.id}
                    onCheckedChange={(v) => toggleActive(w, v)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === w.id}
                    onClick={() => test(w)}
                  >
                    {busyId === w.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === w.id}
                    onClick={() => remove(w)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {w.events.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No events subscribed</span>
                ) : (
                  w.events.map((e) => (
                    <Badge key={e} variant="outline" className="font-mono">
                      {e}
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Secret:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {revealed[w.id] ? w.secret : "•".repeat(Math.min(w.secret.length, 24))}
                </code>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setRevealed((prev) => ({ ...prev, [w.id]: !prev[w.id] }))}
                  aria-label={revealed[w.id] ? "Hide secret" : "Reveal secret"}
                >
                  {revealed[w.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delivery log */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-semibold">Recent deliveries</h2>
        <Card>
          <CardContent className="p-0">
            {deliveries.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No deliveries yet. Send a test event or wait for the next order.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.event}</TableCell>
                      <TableCell>{d.webhookName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {d.orderNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>{d.responseCode ?? "—"}</TableCell>
                      <TableCell>{d.attempts}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit webhook" : "Add webhook"}</DialogTitle>
            <DialogDescription>
              Send a signed HTTP POST to your endpoint whenever a subscribed event occurs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                value={form.name}
                placeholder="Fulfilment service"
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input
                id="wh-url"
                value={form.url}
                placeholder="https://example.com/webhooks/verdant"
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-secret">Signing secret</Label>
              <div className="flex gap-2">
                <Input
                  id="wh-secret"
                  value={form.secret}
                  placeholder="At least 8 characters"
                  className="font-mono text-xs"
                  onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((p) => ({ ...p, secret: generateSecret() }))}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used to compute the HMAC-SHA256 signature. Store it securely on your receiver.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 rounded-md border p-3">
                {events.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.events.includes(event)}
                      onCheckedChange={(v) => toggleEvent(event, v === true)}
                    />
                    <span className="font-mono text-xs">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive webhooks do not receive events.
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
              {editingId ? "Save changes" : "Create webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
