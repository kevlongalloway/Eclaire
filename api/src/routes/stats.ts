import { Hono } from "hono";
import type { Env } from "../types";
import { ok } from "../lib/response";

export const adminStats = new Hono<{ Bindings: Env }>();

// GET /admin/stats?store_id=  — aggregate figures for the overview dashboard.
// When store_id is present, every aggregate is scoped to that store; otherwise
// figures span all stores (the original, single-store behaviour).
adminStats.get("/", async (c) => {
  const db = c.env.DB;
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();
  const storeId = c.req.query("store_id") || null;

  // Build the optional store filter for each query shape.
  const oStore = storeId ? ` AND o.store_id = ?` : "";   // aliased orders (o)
  const ordStore = storeId ? ` AND store_id = ?` : "";   // bare orders table
  const prodStore = storeId ? ` WHERE store_id = ?` : ""; // products (no other WHERE)
  const sb = (...extra: unknown[]) => (storeId ? [storeId, ...extra] : extra);

  const [totals, recent30, units, productCounts, unfulfilled, recentOrders, daily] =
    await Promise.all([
      db
        .prepare(
          `SELECT COUNT(*) AS orders,
                  COALESCE(SUM(amount_total),0) AS revenue,
                  COALESCE(SUM(amount_discount),0) AS discounts
           FROM orders WHERE status = 'paid'${ordStore}`,
        )
        .bind(...sb())
        .first<{ orders: number; revenue: number; discounts: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS orders, COALESCE(SUM(amount_total),0) AS revenue
           FROM orders WHERE status = 'paid' AND created_at >= ?${ordStore}`,
        )
        .bind(...(storeId ? [since30, storeId] : [since30]))
        .first<{ orders: number; revenue: number }>(),
      db
        .prepare(
          `SELECT COALESCE(SUM(oi.quantity),0) AS units
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE o.status = 'paid'${oStore}`,
        )
        .bind(...sb())
        .first<{ units: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS total, COALESCE(SUM(active),0) AS active FROM products${prodStore}`,
        )
        .bind(...sb())
        .first<{ total: number; active: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM orders WHERE fulfillment_status = 'unfulfilled'${ordStore}`,
        )
        .bind(...sb())
        .first<{ n: number }>(),
      db
        .prepare(
          `SELECT id, customer_email, amount_total, currency, status, fulfillment_status, created_at
           FROM orders${storeId ? " WHERE store_id = ?" : ""} ORDER BY created_at DESC LIMIT 5`,
        )
        .bind(...sb())
        .all(),
      db
        .prepare(
          `SELECT substr(created_at,1,10) AS day,
                  COUNT(*) AS orders,
                  COALESCE(SUM(amount_total),0) AS revenue
           FROM orders WHERE status = 'paid' AND created_at >= ?${ordStore}
           GROUP BY day ORDER BY day`,
        )
        .bind(...(storeId ? [since14, storeId] : [since14]))
        .all(),
    ]);

  const orderCount = totals?.orders ?? 0;
  const revenue = totals?.revenue ?? 0;

  return ok(c, {
    currency: "usd",
    revenue_total: revenue,
    discounts_total: totals?.discounts ?? 0,
    order_count: orderCount,
    avg_order_value: orderCount ? Math.round(revenue / orderCount) : 0,
    units_sold: units?.units ?? 0,
    revenue_last_30d: recent30?.revenue ?? 0,
    orders_last_30d: recent30?.orders ?? 0,
    product_count: productCounts?.total ?? 0,
    active_product_count: productCounts?.active ?? 0,
    unfulfilled_count: unfulfilled?.n ?? 0,
    recent_orders: recentOrders.results,
    daily: daily.results, // [{ day, orders, revenue }]
  });
});
