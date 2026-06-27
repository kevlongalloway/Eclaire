import { Hono } from "hono";
import type { Env } from "../types";
import { nowIso } from "../lib/db";
import { getOrderWithItems } from "../lib/orders";
import { fail, ok } from "../lib/response";
import { checkRateLimit, clientIp } from "../lib/rateLimit";

/* ----------------------------- public routes ----------------------------- */
export const publicOrders = new Hono<{ Bindings: Env }>();

// GET /orders?session_id=  — the success page polls this; 404 until the
// webhook has created the order.
publicOrders.get("/", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) return fail(c, "`session_id` is required.", 400);

  const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE session_id = ?`)
    .bind(sessionId)
    .first();
  if (!order) return fail(c, "Order not found yet.", 404);

  return ok(c, await getOrderWithItems(c.env, order));
});

// POST /orders/track  { confirmationNumber, email } — the no-account lookup
// customers reach from the footer. Both fields must match the same order, or
// we return the same generic 404 either way — never reveal which one missed.
publicOrders.post("/track", async (c) => {
  const allowed = await checkRateLimit(c.env, clientIp(c), 10);
  if (!allowed) return fail(c, "Too many attempts. Please try again in a minute.", 429);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const confirmationNumber = normalizeConfirmationNumber(String(body.confirmationNumber ?? ""));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!confirmationNumber || !email) {
    return fail(c, "Order number and email are both required.");
  }

  const order = await c.env.DB.prepare(
    `SELECT * FROM orders WHERE confirmation_number = ? AND LOWER(customer_email) = ?`,
  )
    .bind(confirmationNumber, email)
    .first();
  if (!order) return fail(c, "We couldn't find an order matching those details.", 404);

  return ok(c, await getOrderWithItems(c.env, order));
});

// Accepts "EC-7K2QXM9P", "7k2qxm9p", or "ec 7k2qxm9p" and normalizes to the
// stored "EC-XXXXXXXX" form so minor formatting differences don't 404.
function normalizeConfirmationNumber(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/^EC[-\s]?/, "").replace(/[^A-Z0-9]/g, "");
  return cleaned ? `EC-${cleaned}` : "";
}

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
