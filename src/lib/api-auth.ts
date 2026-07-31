import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { ApiScope } from "@prisma/client";

// ---------------------------------------------------------------------------
// API key authentication for the public REST API (/api/v1/*).
//
// Keys look like:  vrd_live_<32 hex chars>
// Only the SHA-256 hash is stored in the database; the plaintext is shown once
// at creation time. Clients authenticate with either header:
//   Authorization: Bearer vrd_live_xxx
//   X-API-Key: vrd_live_xxx
// ---------------------------------------------------------------------------

export const API_KEY_PREFIX = "vrd_live_";

/** Generate a new plaintext API key plus its hash and display prefix. */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const key = `${API_KEY_PREFIX}${secret}`;
  return {
    key,
    keyHash: hashApiKey(key),
    // Non-secret identifier shown in the admin UI, e.g. "vrd_live_a1b2c3…".
    keyPrefix: `${API_KEY_PREFIX}${secret.slice(0, 6)}`,
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Extract the raw key from the request headers, if present. */
function readKeyFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();
  return null;
}

export type ApiKeyContext = {
  id: string;
  name: string;
  scopes: ApiScope[];
};

export type AuthResult =
  | { ok: true; key: ApiKeyContext }
  | { ok: false; status: 401 | 403; code: string; message: string };

/**
 * Authenticate a request against the ApiKey table and check the required scope.
 * WRITE implies READ. Updates usage stats asynchronously (never blocking).
 */
export async function authenticateApiKey(
  req: Request,
  required: ApiScope = "READ",
): Promise<AuthResult> {
  const raw = readKeyFromRequest(req);
  if (!raw) {
    return {
      ok: false,
      status: 401,
      code: "missing_api_key",
      message: "Provide an API key via the 'Authorization: Bearer <key>' or 'X-API-Key' header.",
    };
  }

  let record;
  try {
    record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(raw) } });
  } catch (err) {
    console.error("[api-auth] lookup failed:", err);
    return { ok: false, status: 401, code: "invalid_api_key", message: "Could not verify API key." };
  }

  if (!record || !record.isActive) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Invalid or revoked API key." };
  }
  if (record.expiresAt && record.expiresAt < new Date()) {
    return { ok: false, status: 401, code: "expired_api_key", message: "This API key has expired." };
  }

  // WRITE keys can also read; READ keys cannot write.
  const hasScope = required === "READ" ? record.scopes.length > 0 : record.scopes.includes("WRITE");
  if (!hasScope) {
    return {
      ok: false,
      status: 403,
      code: "insufficient_scope",
      message: `This API key does not have the '${required.toLowerCase()}' scope.`,
    };
  }

  // Best-effort usage tracking; failures must not affect the response.
  prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
    })
    .catch(() => undefined);

  return { ok: true, key: { id: record.id, name: record.name, scopes: record.scopes } };
}
