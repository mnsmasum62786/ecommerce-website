import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed";
import { SCHEMA_SQL } from "@/lib/schema-sql";
import { generateApiKey } from "@/lib/api-auth";

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

// Idempotent column additions for schema changes made after the initial
// release (CREATE TABLE won't alter an existing table). Safe to run repeatedly.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE "ScriptSettings" ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT`,
  `ALTER TABLE "ScriptSettings" ADD COLUMN IF NOT EXISTS "metaTestEventCode" TEXT`,
  `ALTER TABLE "ScriptSettings" ADD COLUMN IF NOT EXISTS "metaCapiEnabled" BOOLEAN NOT NULL DEFAULT false`,
];

async function ensureColumns(): Promise<number> {
  let applied = 0;
  for (const stmt of COLUMN_MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      applied++;
    } catch (err) {
      console.error("[setup] column migration failed:", stmt, err);
    }
  }
  return applied;
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

/**
 * Optionally mint a REST API key during bootstrap (?bootstrapKey=1).
 * Gated by the same secret that already permits full schema + seed access, so
 * this grants no additional privilege — it exists so the API can be exercised
 * before an admin has signed in. Reuses the single key named below rather than
 * creating duplicates on repeated setup calls.
 */
async function bootstrapApiKey(): Promise<{ key: string; id: string } | null> {
  const name = "Bootstrap key";
  try {
    const { key, keyHash, keyPrefix } = generateApiKey();
    // Replace any previous bootstrap key so only one is ever valid.
    await prisma.apiKey.deleteMany({ where: { name } });
    const created = await prisma.apiKey.create({
      data: { name, keyHash, keyPrefix, scopes: ["READ", "WRITE"] },
    });
    return { key, id: created.id };
  } catch (err) {
    console.error("[setup] Could not create bootstrap API key:", err);
    return null;
  }
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!isAuthorized(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await ensureSchema();
    const columns = await ensureColumns();
    const seeded = await runSeed(prisma);
    const apiKey = url.searchParams.get("bootstrapKey") ? await bootstrapApiKey() : null;
    return NextResponse.json({ ok: true, schema, columns, seeded, apiKey, env: envStatus() });
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
