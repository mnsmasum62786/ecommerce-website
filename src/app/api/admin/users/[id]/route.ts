import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  // Only admins may change roles; staff cannot.
  if (session.user.role !== Role.ADMIN) {
    return apiError("Only administrators can change roles.", 403);
  }

  // Never let a user change their own role (avoids self-demotion lockout).
  if (params.id === session.user.id) {
    return apiError("You cannot change your own role.", 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid role.", 400);
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return apiError("User not found.", 404);
  if (target.role !== Role.ADMIN && target.role !== Role.STAFF) {
    return apiError("Only team members can be managed here.", 400);
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return apiError("User not found.", 404);
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  // Only admins may delete team members.
  if (session.user.role !== Role.ADMIN) {
    return apiError("Only administrators can remove team members.", 403);
  }

  // Block deleting yourself.
  if (params.id === session.user.id) {
    return apiError("You cannot delete your own account.", 400);
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return apiError("User not found.", 404);
  if (target.role !== Role.ADMIN && target.role !== Role.STAFF) {
    return apiError("Only team members can be removed here.", 400);
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return apiError("User not found.", 404);
    }
    throw err;
  }
}
