import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";
import { generateApiKey } from "@/lib/api-auth";

// Admin management of API keys used by third-party platforms to call /api/v1/*.
// The plaintext key is returned exactly once, at creation time.
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  scopes: z.array(z.enum(["READ", "WRITE"])).min(1, "Select at least one scope."),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  // Never expose keyHash.
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      requestCount: k.requestCount,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    })),
  });
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid request.", 400);
  }

  const { key, keyHash, keyPrefix } = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  return NextResponse.json({
    // `key` is shown once and never retrievable again.
    key,
    apiKey: {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      isActive: created.isActive,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    },
  });
}
