"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { slugify } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageUploader } from "@/components/admin/image-uploader";

export type ManagedCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  productCount: number;
};

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  parentId: string;
  imageUrl: string[];
  sortOrder: string;
};

const NONE = "__none__";

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    description: "",
    parentId: NONE,
    imageUrl: [],
    sortOrder: "0",
  };
}

export function CategoryManager({ categories }: { categories: ManagedCategory[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [create, setCreate] = useState<FormState>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openEdit(cat: ManagedCategory) {
    setEditing(cat);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      slugTouched: true,
      description: cat.description ?? "",
      parentId: cat.parentId ?? NONE,
      imageUrl: cat.imageUrl ? [cat.imageUrl] : [],
      sortOrder: String(cat.sortOrder),
    });
  }

  function toPayload(form: FormState) {
    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      parentId: form.parentId === NONE ? null : form.parentId,
      imageUrl: form.imageUrl[0] ?? null,
      sortOrder: Number(form.sortOrder) || 0,
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!create.name.trim()) {
      toast({ title: "Name is required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(create)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create category.");
      }
      toast({ title: "Category created." });
      setCreate(emptyForm());
      router.refresh();
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim()) {
      toast({ title: "Name is required.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/categories/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update category.");
      }
      toast({ title: "Category updated." });
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(cat: ManagedCategory) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete category.");
      }
      toast({ title: "Category deleted." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // Parent options for the edit dialog exclude the category being edited.
  const parentOptions = (excludeId?: string) =>
    categories.filter((c) => c.id !== excludeId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>All categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="font-medium">{cat.name}</div>
                      <div className="text-xs text-muted-foreground">/{cat.slug}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.parentName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cat.productCount}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cat.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === cat.id}
                          onClick={() => handleDelete(cat)}
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                          <span className="sr-only">Delete</span>
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

      <Card>
        <CardHeader>
          <CardTitle>New category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={create.name}
                onChange={(e) =>
                  setCreate((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: prev.slugTouched ? prev.slug : slugify(e.target.value),
                  }))
                }
                placeholder="Fresh Produce"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={create.slug}
                onChange={(e) =>
                  setCreate((prev) => ({ ...prev, slug: e.target.value, slugTouched: true }))
                }
                placeholder="fresh-produce"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={create.description}
                onChange={(e) =>
                  setCreate((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent category</Label>
              <Select
                value={create.parentId}
                onValueChange={(v) => setCreate((prev) => ({ ...prev, parentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (top level)</SelectItem>
                  {parentOptions().map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUploader
                value={create.imageUrl}
                onChange={(urls) => setCreate((prev) => ({ ...prev, imageUrl: urls }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Sort order</Label>
              <Input
                id="cat-order"
                type="number"
                value={create.sortOrder}
                onChange={(e) =>
                  setCreate((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create category
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Parent category</Label>
                <Select
                  value={editForm.parentId}
                  onValueChange={(v) => setEditForm((prev) => ({ ...prev, parentId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (top level)</SelectItem>
                    {parentOptions(editing.id).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageUploader
                  value={editForm.imageUrl}
                  onChange={(urls) => setEditForm((prev) => ({ ...prev, imageUrl: urls }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order">Sort order</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
