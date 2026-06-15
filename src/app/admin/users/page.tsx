import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { UserManager } from "@/components/admin/user-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  const [users] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.STAFF] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Team members"
        description="Manage administrator and staff accounts for the store."
      />
      <UserManager
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session?.user?.id ?? ""}
        currentUserRole={(session?.user?.role as Role) ?? Role.STAFF}
      />
    </div>
  );
}
