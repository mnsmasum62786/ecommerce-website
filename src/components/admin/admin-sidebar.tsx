"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/components/admin/admin-nav-items";

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5 font-serif text-lg font-bold text-brand-700">
        <Leaf className="h-5 w-5 text-brand-500" />
        Verdant Admin
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ADMIN_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-100 text-brand-800" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          View store
        </Link>
      </div>
    </aside>
  );
}
