"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Copy, Check, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/utils";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  requestCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export function ApiKeyManager({ initialKeys, baseUrl }: { initialKeys: ApiKeyRow[]; baseUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [canWrite, setCanWrite] = useState(true);
  const [creating, setCreating] = useState(false);
  // The plaintext key is only available immediately after creation.
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createKey() {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give the key a recognisable name.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: canWrite ? ["READ", "WRITE"] : ["READ"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create key.");
      setNewKey(data.key);
      setKeys((prev) => [{ ...data.apiKey, lastUsedAt: null, requestCount: 0 }, ...prev]);
      setName("");
      toast({ title: "API key created", description: "Copy it now — it won't be shown again." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not create key",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive } : k)));
    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) {
      // Roll back the optimistic update.
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: !isActive } : k)));
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  async function revoke(id: string, keyName: string) {
    if (!confirm(`Revoke "${keyName}"? Any integration using this key will stop working immediately.`)) return;
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "Key revoked" });
      router.refresh();
    } else {
      toast({ title: "Could not revoke key", variant: "destructive" });
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* One-time key reveal */}
      {newKey && (
        <Card className="border-brand-300 bg-brand-50">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm font-medium">
                Copy this key now — for security it is stored hashed and cannot be shown again.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded-md border bg-background px-3 py-2 font-mono text-sm">
                {newKey}
              </code>
              <Button size="sm" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 font-medium">
            <KeyRound className="h-4 w-4" /> Create an API key
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={name}
                placeholder="e.g. Zapier integration"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox checked={canWrite} onCheckedChange={(v) => setCanWrite(Boolean(v))} />
              Allow write access
            </label>
            <Button onClick={createKey} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create key
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only keys can list and fetch data. Write keys can also create, update, and delete.
          </p>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No API keys yet. Create one above to let a third-party platform manage your store.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{k.keyPrefix}…</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} variant={s === "WRITE" ? "default" : "secondary"}>
                            {s.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{k.requestCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "Never"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={k.isActive} onCheckedChange={(v) => toggleActive(k.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revoke(k.id, k.name)}
                        aria-label={`Revoke ${k.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick start */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-medium">Using the API</h3>
          <p className="text-sm text-muted-foreground">
            Send your key as a bearer token (or in an <code className="text-xs">X-API-Key</code> header) to any{" "}
            <code className="text-xs">/api/v1</code> endpoint.
          </p>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
            {`curl "${baseUrl}/api/v1/products?limit=5" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Full reference:{" "}
            <a href="/api/v1/docs" className="font-medium text-brand-600 hover:underline">
              /api/v1/docs
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
