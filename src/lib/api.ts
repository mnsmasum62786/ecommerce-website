import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

/** Standard JSON error response. */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Guard for admin API route handlers. Returns the session on success, or a
 * NextResponse (401/403) that the caller should return immediately.
 *
 * Note: middleware already gates /api/admin/*, but we re-check here so that
 * non-/admin API routes can reuse this and to defend in depth.
 */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return { error: apiError("Unauthorized", 401) as NextResponse, session: null as never };
  }
  return { error: null, session };
}
