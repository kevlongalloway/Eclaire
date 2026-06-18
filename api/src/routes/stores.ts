import { Hono } from "hono";
import type { Env, Store } from "../types";
import { nowIso } from "../lib/db";
import { newId, slugify } from "../lib/id";
import { fail, ok } from "../lib/response";

/* ------------------------------ admin routes ------------------------------ */
export const adminStores = new Hono<{ Bindings: Env }>();

interface StoreRow {
  id: string;
  slug: string;
  name: string;
  active: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

function rowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    active: row.active === 1,
    currency: row.currency ?? "usd",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /admin/stores — all stores, newest first.
adminStores.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM stores ORDER BY created_at DESC`,
  ).all();
  return ok(c, results.map((r) => rowToStore(r as never)));
});

// GET /admin/stores/:id
adminStores.get("/:id", async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM stores WHERE id = ?`)
    .bind(c.req.param("id"))
    .first();
  if (!row) return fail(c, "Store not found.", 404);
  return ok(c, rowToStore(row as never));
});

// POST /admin/stores — create. name required; slug from body or slugify(name).
adminStores.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const name = str(body.name)?.trim();
  if (!name) return fail(c, "`name` is required.");

  const slug = (str(body.slug)?.trim() || slugify(name)) || "";
  if (!slug) return fail(c, "Could not derive a slug — provide one explicitly.");

  const existing = await c.env.DB.prepare(`SELECT id FROM stores WHERE slug = ?`)
    .bind(slug)
    .first();
  if (existing) return fail(c, `A store with slug “${slug}” already exists.`, 409);

  const id = newId("store");
  const now = nowIso();
  try {
    await c.env.DB.prepare(
      `INSERT INTO stores (id, slug, name, active, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        slug,
        name,
        body.active === false || body.active === 0 ? 0 : 1,
        str(body.currency)?.trim() || "usd",
        now,
        now,
      )
      .run();
  } catch (e) {
    return fail(c, `Could not create store: ${(e as Error).message}`);
  }

  const row = await c.env.DB.prepare(`SELECT * FROM stores WHERE id = ?`).bind(id).first();
  return ok(c, rowToStore(row as never), 201);
});

// PATCH /admin/stores/:id — name, slug, active, currency.
adminStores.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(`SELECT * FROM stores WHERE id = ?`).bind(id).first();
  if (!existing) return fail(c, "Store not found.", 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = ?`);
    binds.push(val);
  };

  if (body.name !== undefined) {
    const name = str(body.name)?.trim();
    if (!name) return fail(c, "`name` cannot be empty.");
    set("name", name);
  }
  if (body.slug !== undefined) {
    const slug = str(body.slug)?.trim() || slugify(str(body.name) ?? "");
    if (!slug) return fail(c, "`slug` cannot be empty.");
    const clash = await c.env.DB.prepare(`SELECT id FROM stores WHERE slug = ? AND id <> ?`)
      .bind(slug, id)
      .first();
    if (clash) return fail(c, `A store with slug “${slug}” already exists.`, 409);
    set("slug", slug);
  }
  if (body.active !== undefined) set("active", body.active ? 1 : 0);
  if (body.currency !== undefined) set("currency", str(body.currency)?.trim() || "usd");

  if (!sets.length) return fail(c, "No updatable fields provided.");
  set("updated_at", nowIso());
  binds.push(id);

  await c.env.DB.prepare(`UPDATE stores SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await c.env.DB.prepare(`SELECT * FROM stores WHERE id = ?`).bind(id).first();
  return ok(c, rowToStore(row as never));
});

// DELETE /admin/stores/:id — blocked for the default store or any store that
// still owns products or orders.
adminStores.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "store_default") {
    return fail(c, "The default store can't be deleted.", 409);
  }

  const existing = await c.env.DB.prepare(`SELECT id FROM stores WHERE id = ?`).bind(id).first();
  if (!existing) return fail(c, "Store not found.", 404);

  const products = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM products WHERE store_id = ?`,
  )
    .bind(id)
    .first<{ n: number }>();
  const orders = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM orders WHERE store_id = ?`,
  )
    .bind(id)
    .first<{ n: number }>();
  if ((products?.n ?? 0) > 0 || (orders?.n ?? 0) > 0) {
    return fail(
      c,
      "This store still has products or orders. Reassign or remove them before deleting.",
      409,
    );
  }

  await c.env.DB.prepare(`DELETE FROM stores WHERE id = ?`).bind(id).run();
  return ok(c, { id, deleted: true });
});

/* -------------------------------- helpers -------------------------------- */
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
