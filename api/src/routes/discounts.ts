import { Hono } from "hono";
import type { Env } from "../types";
import { nowIso, rowToDiscount } from "../lib/db";
import { newId } from "../lib/id";
import { quoteCart, type QuoteItem } from "../lib/discounts";
import { fail, ok } from "../lib/response";

const TYPES = new Set(["percentage", "fixed", "free_shipping"]);

/* ----------------------------- public routes ----------------------------- */
export const publicDiscounts = new Hono<{ Bindings: Env }>();

// POST /discounts/validate  { code?, items: [{ productId, price, quantity }] }
publicDiscounts.post("/validate", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const items: QuoteItem[] = Array.isArray(body.items)
    ? body.items
        .map((i: any) => ({
          productId: String(i?.productId ?? ""),
          price: Number(i?.price ?? 0) || 0,
          quantity: Math.max(1, parseInt(i?.quantity, 10) || 1),
        }))
        .filter((i: QuoteItem) => i.productId)
    : [];

  const code = typeof body.code === "string" && body.code.trim() ? body.code.trim() : undefined;
  const quote = await quoteCart(c.env, items, code);
  return ok(c, quote);
});

/* ------------------------------ admin routes ------------------------------ */
export const adminDiscounts = new Hono<{ Bindings: Env }>();

adminDiscounts.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM discounts ORDER BY created_at DESC`,
  ).all();
  return ok(c, results.map((r) => rowToDiscount(r as never)));
});

adminDiscounts.get("/:id", async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM discounts WHERE id = ?`)
    .bind(c.req.param("id"))
    .first();
  if (!row) return fail(c, "Discount not found.", 404);
  return ok(c, rowToDiscount(row as never));
});

adminDiscounts.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const type = String(body.type ?? "");
  if (!TYPES.has(type)) return fail(c, "`type` must be percentage | fixed | free_shipping.");

  const automatic = body.automatic === true || body.automatic === 1;
  const code = typeof body.code === "string" && body.code.trim() ? body.code.trim() : null;
  if (!automatic && !code) return fail(c, "A non-automatic discount needs a `code`.");

  const value = parseInt(body.value, 10) || 0;
  if (type === "percentage" && (value < 0 || value > 100)) {
    return fail(c, "Percentage `value` must be between 0 and 100.");
  }

  const id = newId("disc");
  const now = nowIso();
  try {
    await c.env.DB.prepare(
      `INSERT INTO discounts (id, code, name, description, type, value, automatic, free_shipping,
         active, min_subtotal, starts_at, ends_at, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
      .bind(
        id,
        code,
        String(body.name ?? ""),
        String(body.description ?? ""),
        type,
        value,
        automatic ? 1 : 0,
        body.free_shipping === true || body.free_shipping === 1 || type === "free_shipping" ? 1 : 0,
        body.active === false || body.active === 0 ? 0 : 1,
        intOrNull(body.min_subtotal),
        strOrNull(body.starts_at),
        strOrNull(body.ends_at),
        intOrNull(body.usage_limit),
        now,
        now,
      )
      .run();
  } catch (e) {
    return fail(c, `Could not create discount: ${(e as Error).message}`);
  }

  const row = await c.env.DB.prepare(`SELECT * FROM discounts WHERE id = ?`).bind(id).first();
  return ok(c, rowToDiscount(row as never), 201);
});

adminDiscounts.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(`SELECT * FROM discounts WHERE id = ?`).bind(id).first();
  if (!existing) return fail(c, "Discount not found.", 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = ?`);
    binds.push(val);
  };

  if (body.code !== undefined) set("code", strOrNull(body.code));
  if (body.name !== undefined) set("name", String(body.name));
  if (body.description !== undefined) set("description", String(body.description));
  if (body.type !== undefined) {
    if (!TYPES.has(String(body.type))) return fail(c, "Invalid `type`.");
    set("type", String(body.type));
  }
  if (body.value !== undefined) set("value", parseInt(body.value, 10) || 0);
  if (body.automatic !== undefined) set("automatic", body.automatic ? 1 : 0);
  if (body.free_shipping !== undefined) set("free_shipping", body.free_shipping ? 1 : 0);
  if (body.active !== undefined) set("active", body.active ? 1 : 0);
  if (body.min_subtotal !== undefined) set("min_subtotal", intOrNull(body.min_subtotal));
  if (body.starts_at !== undefined) set("starts_at", strOrNull(body.starts_at));
  if (body.ends_at !== undefined) set("ends_at", strOrNull(body.ends_at));
  if (body.usage_limit !== undefined) set("usage_limit", intOrNull(body.usage_limit));

  if (!sets.length) return fail(c, "No updatable fields provided.");
  set("updated_at", nowIso());
  binds.push(id);

  await c.env.DB.prepare(`UPDATE discounts SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await c.env.DB.prepare(`SELECT * FROM discounts WHERE id = ?`).bind(id).first();
  return ok(c, rowToDiscount(row as never));
});

adminDiscounts.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await c.env.DB.prepare(`DELETE FROM discounts WHERE id = ?`).bind(id).run();
  if (!res.meta.changes) return fail(c, "Discount not found.", 404);
  return ok(c, { id, deleted: true });
});

/* -------------------------------- helpers -------------------------------- */
function intOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}
function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
