import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware gates /admin, but we re-check here so that
  // direct rendering can never leak admin UI to a non-admin.
  const session = await getAdminSession();
  if (!session) redirect("/login?callbackUrl=/admin");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AdminMobileNav />
            <div className="truncate text-sm text-muted-foreground">
              <span className="hidden sm:inline">Signed in as </span>
              <span className="font-medium text-foreground">{session.user.email}</span>
              <span className="ml-2 rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {session.user.role}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/api/auth/signout">Sign out</Link>
          </Button>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
