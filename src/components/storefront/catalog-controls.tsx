"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/nav";

// Client controls for the product catalog: a search box and a sort dropdown.
// Both update the URL query string (resetting pagination) so the server page
// can re-query with the new params.
export function CatalogControls({
  currentSort,
  currentQuery,
}: {
  currentSort: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);

  function pushWith(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Any change resets to page 1.
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushWith({ q: query.trim() || null });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={onSearchSubmit} className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="pl-9"
        />
      </form>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">Sort by</span>
        <Select value={currentSort} onValueChange={(value) => pushWith({ sort: value })}>
          <SelectTrigger className="w-[200px]" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
