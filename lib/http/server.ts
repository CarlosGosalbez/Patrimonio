/**
 * Server-side HTTP utilities for API route handlers.
 * Do NOT import this from client components.
 */

/**
 * Safely parses the JSON body of a Request.
 *
 * Returns `{ ok: true, data }` on success, or `{ ok: false, response }` with a
 * 400 JSON response when the body is missing, not JSON, or malformed.
 *
 * Usage:
 *   const body = await parseJsonBody(request)
 *   if (!body.ok) return body.response
 *   const parsed = MySchema.safeParse(body.data)
 */
export async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try {
    const data: unknown = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

/**
 * Normalises a Supabase DB error message to a non-empty string,
 * preventing the empty-string case where `dbError.message || fallback` differs
 * from `dbError.message ?? fallback`.
 */
export function dbErrorMessage(
  err: { message?: string } | null | undefined,
  fallback = "Database error",
): string {
  return err?.message?.trim() || fallback;
}
