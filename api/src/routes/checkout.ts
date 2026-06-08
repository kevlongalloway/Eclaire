import { Hono } from "hono";
import type { Env } from "../types";
import { rowToProduct } from "../lib/db";
import { quoteCart, type QuoteItem } from "../lib/discounts";
import { createCheckoutSession, type CheckoutLineItem } from "../lib/stripe";
import { fail, ok } from "../lib/response";

export const checkout = new Hono<{ Bindings: Env }>();

// POST /checkout/session  { items:[{productId,quantity}], successUrl, cancelUrl, discountCode? }
checkout.post("/session", async (c) => {
  const key = c.env.STRIPE_SECRET_KEY;
  if (!key) return fail(c, "Checkout is not available (Stripe not configured).", 503);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(c, "Invalid JSON body.");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const wanted: { productId: string; quantity: number }[] = rawItems
    .map((i: any) => ({
      productId: String(i?.productId ?? ""),
      quantity: Math.max(1, parseInt(i?.quantity, 10) || 1),
    }))
    .filter((i: { productId: string }) => i.productId);
  if (!wanted.length) return fail(c, "Cart is empty.");

  const successUrl = String(body.successUrl ?? "");
  const cancelUrl = String(body.cancelUrl ?? "");
  if (!successUrl || !cancelUrl) return fail(c, "`successUrl` and `cancelUrl` are required.");

  // Load the authoritative products.
  const ids = wanted.map((i: { productId: string }) => i.productId);
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all();
  const byId = new Map(results.map((r) => [String((r as any).id), rowToProduct(r as never)]));

  const lineItems: CheckoutLineItem[] = [];
  const quoteItems: QuoteItem[] = [];
  for (const w of wanted) {
    const p = byId.get(w.productId);
    if (!p) return fail(c, `Product ${w.productId} is unavailable.`, 409);
    if (!p.active) return fail(c, `“${p.name}” is no longer available.`, 409);
    if (p.stock !== -1 && p.stock < w.quantity) {
      return fail(c, `“${p.name}” has only ${p.stock} left.`, 409);
    }
    lineItems.push({ name: p.name, amount: p.price, currency: p.currency, quantity: w.quantity });
    quoteItems.push({ productId: p.id, price: p.price, quantity: w.quantity });
  }

  // Re-price discounts server-side; never trust client totals.
  const discountCode =
    typeof body.discountCode === "string" && body.discountCode.trim()
      ? body.discountCode.trim()
      : undefined;
  const quote = await quoteCart(c.env, quoteItems, discountCode);
  if (discountCode && !quote.valid) {
    return fail(c, quote.error || "That discount code can't be applied.");
  }

  // Compact cart for the webhook to reconstruct order line items.
  const cartMeta = JSON.stringify(wanted.map((w) => [w.productId, w.quantity]));

  try {
    const session = await createCheckoutSession(key, {
      lineItems,
      successUrl,
      cancelUrl,
      amountOff: quote.discount_amount,
      freeShipping: quote.is_free_shipping,
      metadata: {
        cart: cartMeta.slice(0, 480),
        discount_code: quote.discount?.code ?? "",
        amount_discount: String(quote.discount_amount),
      },
    });
    return ok(c, { url: session.url, sessionId: session.id });
  } catch (e) {
    return fail(c, `Could not start checkout: ${(e as Error).message}`, 502);
  }
});
