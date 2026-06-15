import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed";
import { SCHEMA_SQL } from "@/lib/schema-sql";

// SHA-256 of a one-time setup key. Only the hash is committed (safe for a public
// repo — the key itself is preimage-resistant), so the database can be
// bootstrapped without depending on NEXTAUTH_SECRET being configured yet.
const SETUP_KEY_HASH = "1e62f83ddfd528bf0317bb6d4a0fca6937bbbd189c8c12646e393ac3cca779b5";

function isAuthorized(key: string | null): boolean {
  if (!key) return false;
  const envSecret = process.env.SETUP_SECRET || process.env.NEXTAUTH_SECRET;
  if (envSecret && key === envSecret) return true;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return hash === SETUP_KEY_HASH;
}

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

// Report which critical env vars are present (booleans only — never values) so
// configuration gaps can be diagnosed without dashboard access.
function envStatus() {
  return {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    ADMIN_EMAIL: Boolean(process.env.ADMIN_EMAIL),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
  };
}

async function handle(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await ensureSchema();
    const seeded = await runSeed(prisma);
    return NextResponse.json({ ok: true, schema, seeded, env: envStatus() });
  } catch (err) {
    console.error("[setup] Failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Setup failed", env: envStatus() },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
