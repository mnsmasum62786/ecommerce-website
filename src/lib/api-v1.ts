import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import type { ApiScope } from "@prisma/client";
import { authenticateApiKey, type ApiKeyContext } from "@/lib/api-auth";

// ---------------------------------------------------------------------------
// Shared plumbing for the public REST API (/api/v1/*): consistent JSON
// envelopes, pagination, error handling, CORS, and the auth guard.
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

/** Success envelope: { data, meta? } */
export function ok(data: unknown, init?: { status?: number; meta?: unknown }) {
  return NextResponse.json(
    init?.meta === undefined ? { data } : { data, meta: init.meta },
    { status: init?.status ?? 200, headers: CORS_HEADERS },
  );
}

/** Error envelope: { error: { code, message, details? } } */
export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: details === undefined ? { code, message } : { code, message, details } },
    { status, headers: CORS_HEADERS },
  );
}

export function notFound(resource = "Resource") {
  return fail("not_found", `${resource} not found.`, 404);
}

/** Preflight handler — re-export as `OPTIONS` from any v1 route. */
export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// --- Pagination -------------------------------------------------------------

export type Pagination = { page: number; limit: number; skip: number };

export function readPagination(url: URL, defaultLimit = 25, maxLimit = 100): Pagination {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const rawLimit = Number(url.searchParams.get("limit")) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(total: number, { page, limit }: Pagination) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}

// --- Body parsing / validation ---------------------------------------------

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<Parsed<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: fail("invalid_json", "Request body must be valid JSON.", 400) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { ok: false, response: validationError(result.error) };
  }
  return { ok: true, data: result.data };
}

export function validationError(error: ZodError) {
  return fail(
    "validation_error",
    "One or more fields are invalid.",
    422,
    error.errors.map((e) => ({ field: e.path.join(".") || "(root)", message: e.message })),
  );
}

// --- Route handler wrapper --------------------------------------------------

export type ApiHandler<C = unknown> = (
  req: Request,
  ctx: C,
  key: ApiKeyContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a v1 route handler with API-key auth, scope checking, CORS headers, and
 * uniform error handling so individual routes stay focused on their resource.
 */
export function withApiKey<C = unknown>(scope: ApiScope, handler: ApiHandler<C>) {
  return async (req: Request, ctx: C): Promise<NextResponse> => {
    const auth = await authenticateApiKey(req, scope);
    if (!auth.ok) return fail(auth.code, auth.message, auth.status);

    try {
      return await handler(req, ctx, auth.key);
    } catch (err) {
      // Surface Prisma's unique-constraint violation as a clean 409.
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        const target = (err as { meta?: { target?: string[] } })?.meta?.target?.join(", ");
        return fail("conflict", `A record with that ${target ?? "value"} already exists.`, 409);
      }
      if (code === "P2025") return notFound();
      console.error("[api/v1] Unhandled error:", err);
      return fail("internal_error", "An unexpected error occurred.", 500);
    }
  };
}
