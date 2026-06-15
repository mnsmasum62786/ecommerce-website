"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/components/admin/admin-nav-items";

// Mobile navigation for the admin panel: a hamburger button that opens a
// slide-over drawer with every admin section. Hidden on md+ where the
// persistent sidebar is shown instead.
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open admin menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 max-w-[80%] flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4 font-serif text-lg font-bold text-brand-700">
              <span className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-brand-500" />
                Verdant Admin
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {ADMIN_NAV.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-100 text-brand-800"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-3">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
                View store
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
