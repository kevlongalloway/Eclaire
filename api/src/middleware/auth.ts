import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../types";
import { fail } from "../lib/response";
import { isAuthConfigured, validateSession } from "../lib/admin";

/**
 * Guards protected /admin/* routes. Requires a valid session token (issued by
 * POST /admin/auth/login) sent as `Authorization: Bearer <token>`. The session
 * is looked up in D1; on success the username + token hash are stashed on the
 * context for downstream handlers (logout, password change).
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  if (!isAuthConfigured(c.env)) {
    return fail(c, "Admin auth is not configured (ADMIN_USERNAME / ADMIN_PASSWORD).", 503);
  }

  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (!token) return fail(c, "Unauthorized.", 401);

  const session = await validateSession(c.env, token);
  if (!session) return fail(c, "Your session has expired. Please sign in again.", 401);

  c.set("sessionTokenHash", session.tokenHash);
  c.set("adminUsername", session.username);
  await next();
};
