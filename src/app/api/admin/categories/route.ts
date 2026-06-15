import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { uniqueCategorySlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid category data.", 400);
  }
  const data = parsed.data;

  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) return apiError("Selected parent category does not exist.", 400);
  }

  const slug = await uniqueCategorySlug(data.slug?.trim() || data.name);

  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description?.trim() || null,
        parentId: data.parentId || null,
        imageUrl: data.imageUrl?.trim() || null,
        sortOrder: data.sortOrder,
      },
    });
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create category.";
    return apiError(message, 500);
  }
}
