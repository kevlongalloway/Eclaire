import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";
import { fail } from "../lib/response";

/**
 * Guards every /admin/* route with a shared secret. The admin portal sends it
 * as `Authorization: Bearer <ADMIN_API_KEY>` or `X-Admin-Key: <ADMIN_API_KEY>`.
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const expected = c.env.ADMIN_API_KEY;
  if (!expected) {
    return fail(c, "Admin API is not configured (ADMIN_API_KEY unset).", 503);
  }
  const header = c.req.header("Authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const provided = bearer || c.req.header("X-Admin-Key");

  if (!provided || !constantTimeEqual(provided, expected)) {
    return fail(c, "Unauthorized.", 401);
  }
  await next();
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
