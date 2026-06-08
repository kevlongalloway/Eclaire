import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Every JSON response uses the `{ ok, data }` / `{ ok, error }` envelope the
 * storefront client (storefront/src/api.js) unwraps.
 */
export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ ok: true, data }, status);
}

export function fail(c: Context, error: string, status: ContentfulStatusCode = 400) {
  return c.json({ ok: false, error }, status);
}

/** Thrown anywhere in a handler to short-circuit with a clean error envelope. */
export class ApiError extends Error {
  status: ContentfulStatusCode;
  constructor(message: string, status: ContentfulStatusCode = 400) {
    super(message);
    this.status = status;
  }
}
