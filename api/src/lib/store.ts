import type { Context } from "hono";
import type { Env } from "../types";

/** Raw store row as stored in D1 (active is 0/1). */
export interface StoreRow {
  id: string;
  slug: string;
  name: string;
  active: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * Read the store slug a public request is declaring, via the `X-Store-Slug`
 * header (case-insensitive) or the `?store=` query param. Returns the trimmed
 * slug, or null when neither is present.
 */
export function resolveStoreSlug(c: Context<{ Bindings: Env }>): string | null {
  const header = c.req.header("X-Store-Slug") ?? c.req.header("x-store-slug");
  const raw = header ?? c.req.query("store");
  const slug = (raw ?? "").trim();
  return slug || null;
}

/** Look up an active store by its slug. */
export async function getStoreBySlug(env: Env, slug: string): Promise<StoreRow | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM stores WHERE slug = ? AND active = 1`,
  )
    .bind(slug)
    .first<StoreRow>();
  return row ?? null;
}

/**
 * Resolve the store a public request belongs to:
 *  • no slug declared  → fall back to the `default` store,
 *  • slug declared + found → that store,
 *  • slug declared + missing/inactive → null (the caller should 404).
 */
export async function resolvePublicStore(
  c: Context<{ Bindings: Env }>,
): Promise<StoreRow | null> {
  const slug = resolveStoreSlug(c);
  if (!slug) return getStoreBySlug(c.env, "default");
  return getStoreBySlug(c.env, slug);
}
