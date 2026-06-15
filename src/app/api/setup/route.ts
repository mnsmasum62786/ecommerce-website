import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed";
import { SCHEMA_SQL } from "@/lib/schema-sql";

// Guarded, idempotent database bootstrap endpoint. Creates the schema (tables,
// enums, indexes, constraints) and seeds the catalog in a single authenticated
// request — needed because the database is only reachable from inside the
// deployment environment, not from the build sandbox.
//
// Auth: pass ?key=<secret> matching SETUP_SECRET (falls back to NEXTAUTH_SECRET).
// Only requires DATABASE_URL — no migrations CLI or direct connection needed.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Split the generated DDL into individual statements. Prisma's DDL uses ";" only
// as a statement terminator (never inside string literals), so this is safe.
function statements(sql: string): string[] {
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--")) // drop comment lines
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function ensureSchema(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const stmt of statements(SCHEMA_SQL)) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      created++;
    } catch (err) {
      // Ignore "already exists" / duplicate errors so the endpoint is idempotent.
      const msg = String(err instanceof Error ? err.message : err).toLowerCase();
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        skipped++;
        continue;
      }
      throw err;
    }
  }
  return { created, skipped };
}

async function handle(req: Request) {
  const secret = process.env.SETUP_SECRET || process.env.NEXTAUTH_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await ensureSchema();
    const seeded = await runSeed(prisma);
    return NextResponse.json({ ok: true, schema, seeded });
  } catch (err) {
    console.error("[setup] Failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
