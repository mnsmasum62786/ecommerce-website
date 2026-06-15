"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShoppingCart, Search, Menu, X, Leaf, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Category = { name: string; slug: string };

export function SiteHeader({
  storeName,
  announcement,
  categories,
}: {
  storeName: string;
  announcement?: string | null;
  categories: Category[];
}) {
  const { count } = useCart();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  return (
    <header className="sticky top-0 z-40 w-full">
      {announcement && (
        <div className="bg-brand-700 text-center text-xs text-brand-50 sm:text-sm">
          <p className="container py-2">{announcement}</p>
        </div>
      )}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-brand-700">
            <Leaf className="h-6 w-6 text-brand-500" />
            <span className="hidden sm:inline">{storeName}</span>
            <span className="sm:hidden">Verdant</span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <Link href="/products" className="text-sm font-medium hover:text-brand-600">
              Shop All
            </Link>
            {categories.slice(0, 5).map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="text-sm font-medium hover:text-brand-600"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <form action="/products" className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  name="q"
                  placeholder="Search products..."
                  className="h-9 w-44 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </form>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {session?.user ? (
                  <>
                    <DropdownMenuLabel className="truncate">{session.user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">My Orders</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>Sign out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login">Sign in</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register">Create account</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" asChild className="relative" aria-label="Cart">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="container flex flex-col gap-1 border-t py-3 lg:hidden">
            <Link href="/products" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              Shop All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="py-2 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
