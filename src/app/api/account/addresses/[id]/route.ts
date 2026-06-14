import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function ownsAddress(userId: string, id: string) {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) return null;
  return address;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const address = await ownsAddress(session.user.id, params.id);
  if (!address) {
    return NextResponse.json({ error: "Address not found." }, { status: 404 });
  }

  await prisma.address.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const address = await ownsAddress(userId, params.id);
  if (!address) {
    return NextResponse.json({ error: "Address not found." }, { status: 404 });
  }

  // Sets this address as the default (clearing the others).
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: params.id }, data: { isDefault: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
