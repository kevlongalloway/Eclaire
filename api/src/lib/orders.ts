import { newId } from "./id";
import { nowIso } from "./db";
import type { Env } from "../types";

/**
 * Creates an order (+ line items) from a completed Stripe Checkout Session and
 * decrements stock. Idempotent on session id — a replayed webhook is a no-op.
 * The `session` is the expanded Stripe object (line_items, customer_details).
 */
export async function createOrderFromSession(env: Env, session: any): Promise<string | null> {
  const sessionId: string = session.id;

  const existing = await env.DB.prepare(`SELECT id FROM orders WHERE session_id = ?`)
    .bind(sessionId)
    .first<{ id: string }>();
  if (existing) return existing.id;

  const orderId = newId("order");
  const now = nowIso();

  const shipping = session.shipping_details || session.customer_details || {};
  const addr = shipping.address || {};
  const meta = session.metadata || {};
  const storeId = typeof meta.store === "string" && meta.store ? meta.store : "store_default";

  // Reconstruct line items: prefer our cart metadata (keeps real product ids),
  // fall back to Stripe's expanded line_items.
  const lineItems: { productId: string | null; name: string; quantity: number; unitPrice: number }[] = [];
  let cart: [string, number][] = [];
  try {
    cart = meta.cart ? JSON.parse(meta.cart) : [];
  } catch {
    cart = [];
  }

  if (cart.length) {
    const ids = cart.map(([id]) => id);
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT id, name, price FROM products WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .all<{ id: string; name: string; price: number }>();
    const byId = new Map(results.map((r) => [r.id, r]));
    for (const [id, qty] of cart) {
      const p = byId.get(id);
      lineItems.push({
        productId: id,
        name: p?.name ?? id,
        quantity: qty,
        unitPrice: p?.price ?? 0,
      });
    }
  } else if (session.line_items?.data) {
    for (const li of session.line_items.data) {
      lineItems.push({
        productId: null,
        name: li.description ?? "Item",
        quantity: li.quantity ?? 1,
        unitPrice: li.price?.unit_amount ?? 0,
      });
    }
  }

  const amountSubtotal = session.amount_subtotal ?? 0;
  const amountTotal = session.amount_total ?? 0;
  const amountDiscount = Number(meta.amount_discount ?? Math.max(0, amountSubtotal - amountTotal)) || 0;

  const statements: D1PreparedStatement[] = [];
  statements.push(
    env.DB.prepare(
      `INSERT INTO orders (id, session_id, payment_intent, status, fulfillment_status, customer_email,
        amount_subtotal, amount_discount, amount_total, currency, discount_code,
        shipping_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state,
        shipping_postal_code, shipping_country, store_id, created_at, updated_at)
       VALUES (?, ?, ?, 'paid', 'unfulfilled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      orderId,
      sessionId,
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      session.customer_details?.email ?? null,
      amountSubtotal,
      amountDiscount,
      amountTotal,
      (session.currency ?? "usd").toLowerCase(),
      meta.discount_code || null,
      shipping.name ?? session.customer_details?.name ?? null,
      addr.line1 ?? null,
      addr.line2 ?? null,
      addr.city ?? null,
      addr.state ?? null,
      addr.postal_code ?? null,
      addr.country ?? null,
      storeId,
      now,
      now,
    ),
  );

  for (const li of lineItems) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(newId("oi"), orderId, li.productId, li.name, li.quantity, li.unitPrice, now),
    );
    // Decrement finite stock (leave -1 "unlimited" alone).
    if (li.productId) {
      statements.push(
        env.DB.prepare(
          `UPDATE products SET stock = MAX(0, stock - ?), updated_at = ?
           WHERE id = ? AND stock <> -1`,
        ).bind(li.quantity, now, li.productId),
      );
    }
  }

  await env.DB.batch(statements);
  return orderId;
}

/** Assemble the public order view (order + items) the success page renders. */
export async function getOrderWithItems(env: Env, order: any) {
  const { results } = await env.DB.prepare(
    `SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id = ?`,
  )
    .bind(order.id)
    .all();
  return { ...order, items: results };
}
