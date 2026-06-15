import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed";

// Guarded, idempotent database seed endpoint. Lets the catalog be populated (or
// re-populated) after deploy with a single authenticated request — useful when
// the database can only be reached from inside the deployment environment.
//
// Auth: pass ?key=<secret> matching SETUP_SECRET (falls back to NEXTAUTH_SECRET).
// Tables themselves are created by `prisma migrate deploy` during the build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request) {
  const secret = process.env.SETUP_SECRET || process.env.NEXTAUTH_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSeed(prisma);
    return NextResponse.json({ ok: true, seeded: result });
  } catch (err) {
    console.error("[setup] Seed failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
