"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

/**
 * Image uploader used across the admin. Uploads files to Vercel Blob via
 * /api/admin/upload and returns public URLs. Also supports pasting a direct
 * image URL, which is handy when Blob isn't configured (e.g. local dev).
 */
export function ImageUploader({
  value,
  onChange,
  multiple = false,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
        const data = await res.json();
        urls.push(data.url);
      }
      onChange(multiple ? [...value, ...urls] : urls.slice(0, 1));
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try pasting an image URL instead.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    if (!urlInput.trim()) return;
    onChange(multiple ? [...value, urlInput.trim()] : [urlInput.trim()]);
    setUrlInput("");
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url) => (
            <div key={url} className="relative h-24 w-24 overflow-hidden rounded-md border">
              <Image src={url} alt="" fill sizes="96px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </span>
        </label>
        <span className="text-xs text-muted-foreground">or</span>
        <Input
          placeholder="Paste image URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="h-9 max-w-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={addUrl}>
          Add URL
        </Button>
      </div>
    </div>
  );
}
