import type { Context } from "hono";
import type { Env } from "../types";

const WINDOW_MS = 60_000;

/**
 * Fixed 1-minute-window per-IP request counter backed by D1 — there's no
 * KV/Durable Object binding in this project, and D1 is already on hand, so
 * this is the cheapest way to throttle a public lookup endpoint against
 * confirmation-number guessing. Returns false once `limit` is exceeded for
 * the current window.
 */
export async function checkRateLimit(env: Env, ip: string, limit: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / WINDOW_MS);

  await env.DB.prepare(
    `INSERT INTO order_lookup_attempts (ip, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT (ip, window_start) DO UPDATE SET count = count + 1`,
  )
    .bind(ip, windowStart)
    .run();

  const row = await env.DB.prepare(
    `SELECT count FROM order_lookup_attempts WHERE ip = ? AND window_start = ?`,
  )
    .bind(ip, windowStart)
    .first<{ count: number }>();

  // Best-effort prune of old windows; failure here doesn't affect the result.
  env.DB.prepare(`DELETE FROM order_lookup_attempts WHERE window_start < ?`)
    .bind(windowStart - 5)
    .run()
    .catch(() => {});

  return (row?.count ?? 0) <= limit;
}

export function clientIp(c: Context<{ Bindings: Env }>): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}
