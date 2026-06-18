import { Hono } from "hono";
import type { Env } from "../types";
import { rowToProduct, nowIso } from "../lib/db";
import { newId, slugify } from "../lib/id";
import { fail, ok } from "../lib/response";
import { resolvePublicStore } from "../lib/store";

/* ----------------------------- public routes ----------------------------- */
export const publicProducts = new Hono<{ Bindings: Env }>();

// GET /products?limit=&offset=  — only active products for this store, newest first.
publicProducts.get("/", async (c) => {
  const store = await resolvePublicStore(c);
  if (!store) return ok(c, []); // unknown store slug ⇒ empty catalog
  const limit = clampInt(c.req.query("limit"), 100, 1, 200);
  const offset = clampInt(c.req.query("offset"), 0, 0, 1_000_000);
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products WHERE active = 1 AND store_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(store.id, limit, offset)
    .all();
  return ok(c, results.map((r) => rowToProduct(r as never)));
});

// GET /products/:id
publicProducts.get("/:id", async (c) => {
  const store = await resolvePublicStore(c);
  if (!store) return fail(c, "Product not found.", 404);
  const row = await c.env.DB.prepare(
    `SELECT * FROM products WHERE id = ? AND active = 1 AND store_id = ?`,
  )
    .bind(c.req.param("id"), store.id)
    .first();
  if (!row) return fail(c, "Product not found.", 404);
  return ok(c, rowToProduct(row as never));
});

/* ------------------------------ admin routes ------------------------------ */
export const adminProducts = new Hono<{ Bindings: Env }>();

// GET /admin/products — includes inactive; optional ?q= search and ?store_id= filter.
adminProducts.get("/", async (c) => {
  const limit = clampInt(c.req.query("limit"), 100, 1, 500);
  const offset = clampInt(c.req.query("offset"), 0, 0, 1_000_000);
  const q = c.req.query("q");
  const storeId = str(c.req.query("store_id"));

  const where: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    where.push(`(name LIKE ? OR id LIKE ?)`);
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (storeId) {
    where.push(`store_id = ?`);
    binds.push(storeId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")} ` : "";
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products ${clause}ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...binds)
    .all();
  return ok(c, results.map((r) => rowToProduct(r as never)));
});

// GET /admin/products/:id — any status.
adminProducts.get("/:id", async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`)
    .bind(c.req.param("id"))
    .first();
  if (!row) return fail(c, "Product not found.", 404);
  return ok(c, rowToProduct(row as never));
});

// POST /admin/products
adminProducts.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const name = str(body.name);
  if (!name) return fail(c, "`name` is required.");
  const price = int(body.price);
  if (price == null || price < 0) return fail(c, "`price` (integer cents) is required.");

  const id = str(body.id) || `${slugify(name) || "product"}-${newId("p").slice(2, 8)}`;
  const now = nowIso();

  try {
    await c.env.DB.prepare(
      `INSERT INTO products (id, name, description, price, currency, active, stock, images, metadata, store_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        name,
        str(body.description) ?? "",
        price,
        str(body.currency) ?? "usd",
        bool(body.active, true) ? 1 : 0,
        int(body.stock) ?? -1,
        JSON.stringify(asStringArray(body.images)),
        JSON.stringify(asObject(body.metadata)),
        str(body.store_id) || "store_default",
        now,
        now,
      )
      .run();
  } catch (e) {
    return fail(c, `Could not create product: ${(e as Error).message}`);
  }

  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  return ok(c, rowToProduct(row as never), 201);
});

// PATCH /admin/products/:id — partial update.
adminProducts.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  if (!existing) return fail(c, "Product not found.", 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = ?`);
    binds.push(val);
  };

  if (body.name !== undefined) set("name", str(body.name) ?? "");
  if (body.description !== undefined) set("description", str(body.description) ?? "");
  if (body.price !== undefined) {
    const p = int(body.price);
    if (p == null || p < 0) return fail(c, "`price` must be a non-negative integer.");
    set("price", p);
  }
  if (body.currency !== undefined) set("currency", str(body.currency) ?? "usd");
  if (body.active !== undefined) set("active", bool(body.active, true) ? 1 : 0);
  if (body.stock !== undefined) set("stock", int(body.stock) ?? -1);
  if (body.images !== undefined) set("images", JSON.stringify(asStringArray(body.images)));
  if (body.metadata !== undefined) set("metadata", JSON.stringify(asObject(body.metadata)));
  if (body.store_id !== undefined) set("store_id", str(body.store_id) || "store_default");

  if (!sets.length) return fail(c, "No updatable fields provided.");
  set("updated_at", nowIso());
  binds.push(id);

  await c.env.DB.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  return ok(c, rowToProduct(row as never));
});

// DELETE /admin/products/:id
adminProducts.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await c.env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  if (!res.meta.changes) return fail(c, "Product not found.", 404);
  return ok(c, { id, deleted: true });
});

/* -------------------------------- helpers -------------------------------- */
function clampInt(raw: string | undefined, def: number, min: number, max: number): number {
  const n = raw == null ? def : parseInt(raw, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function int(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Math.trunc(Number(v));
  return undefined;
}
function bool(v: unknown, def: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "true") return true;
  if (v === 0 || v === "false") return false;
  return def;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
