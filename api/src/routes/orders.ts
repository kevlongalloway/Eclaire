import { Hono } from "hono";
import type { Env } from "../types";
import { nowIso } from "../lib/db";
import { createOrderFromSession, getOrderWithItems } from "../lib/orders";
import { retrieveCheckoutSession } from "../lib/stripe";
import { fail, ok } from "../lib/response";

/* ----------------------------- public routes ----------------------------- */
export const publicOrders = new Hono<{ Bindings: Env }>();

// GET /orders?session_id=  — the success page polls this. Normally the
// webhook has already created the order by the time this is called; if not
// (webhook not configured/delivered yet, e.g. sandbox testing), fall back to
// asking Stripe directly and create the order here. Idempotent on session_id,
// so this can't race the webhook into a duplicate.
publicOrders.get("/", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) return fail(c, "`session_id` is required.", 400);

  let order = await c.env.DB.prepare(`SELECT * FROM orders WHERE session_id = ?`)
    .bind(sessionId)
    .first();

  if (!order && c.env.STRIPE_SECRET_KEY) {
    try {
      const session = await retrieveCheckoutSession(c.env.STRIPE_SECRET_KEY, sessionId);
      if (session.payment_status === "paid" || session.status === "complete") {
        const orderId = await createOrderFromSession(c.env, session);
        if (orderId) {
          order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first();
        }
      }
    } catch {
      // Bad/unknown session id, wrong Stripe mode, etc. — fall through to 404.
    }
  }

  if (!order) return fail(c, "Order not found yet.", 404);

  return ok(c, await getOrderWithItems(c.env, order));
});

/* ------------------------------ admin routes ------------------------------ */
export const adminOrders = new Hono<{ Bindings: Env }>();

adminOrders.get("/", async (c) => {
  const limit = Math.min(500, Math.max(1, parseInt(c.req.query("limit") ?? "100", 10) || 100));
  const offset = Math.max(0, parseInt(c.req.query("offset") ?? "0", 10) || 0);
  const status = c.req.query("fulfillment_status");
  const storeId = c.req.query("store_id");

  const where: string[] = [];
  const binds: unknown[] = [];
  if (status) {
    where.push(`fulfillment_status = ?`);
    binds.push(status);
  }
  if (storeId) {
    where.push(`store_id = ?`);
    binds.push(storeId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")} ` : "";
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM orders ${clause}ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...binds)
    .all();
  return ok(c, results);
});

adminOrders.get("/:id", async (c) => {
  const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`)
    .bind(c.req.param("id"))
    .first();
  if (!order) return fail(c, "Order not found.", 404);
  return ok(c, await getOrderWithItems(c.env, order));
});

// PATCH /admin/orders/:id — fulfillment status, tracking, status.
adminOrders.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(`SELECT id FROM orders WHERE id = ?`).bind(id).first();
  if (!existing) return fail(c, "Order not found.", 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const editable = [
    "status",
    "fulfillment_status",
    "shipping_carrier",
    "shipping_service",
    "tracking_number",
  ] as const;

  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const col of editable) {
    if (body[col] !== undefined) {
      sets.push(`${col} = ?`);
      binds.push(body[col] == null ? null : String(body[col]));
    }
  }
  if (!sets.length) return fail(c, "No updatable fields provided.");
  sets.push("updated_at = ?");
  binds.push(nowIso(), id);

  await c.env.DB.prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
  return ok(c, await getOrderWithItems(c.env, order));
});
