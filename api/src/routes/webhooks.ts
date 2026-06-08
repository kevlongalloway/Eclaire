import { Hono } from "hono";
import type { Env } from "../types";
import { constructWebhookEvent, retrieveCheckoutSession } from "../lib/stripe";
import { createOrderFromSession } from "../lib/orders";

export const webhooks = new Hono<{ Bindings: Env }>();

// POST /webhooks/stripe — creates orders once Stripe confirms payment.
webhooks.post("/stripe", async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = c.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return c.json({ ok: false, error: "Webhooks not configured." }, 503);
  }

  const sig = c.req.header("Stripe-Signature");
  if (!sig) return c.json({ ok: false, error: "Missing signature." }, 400);

  const payload = await c.req.text();
  let event: any;
  try {
    event = await constructWebhookEvent(payload, sig, secret);
  } catch (e) {
    return c.json({ ok: false, error: `Signature verification failed: ${(e as Error).message}` }, 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      // Re-fetch with line items + customer details expanded.
      const full = await retrieveCheckoutSession(stripeKey, event.data.object.id);
      if (full.payment_status === "paid" || full.status === "complete") {
        await createOrderFromSession(c.env, full);
      }
    }
  } catch (e) {
    // 500 so Stripe retries; the operation is idempotent on session id.
    return c.json({ ok: false, error: (e as Error).message }, 500);
  }

  return c.json({ ok: true, data: { received: true } });
});
