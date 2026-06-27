import type { Env } from "../types";
import { orderConfirmationEmail } from "../emails/orderConfirmation";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends one transactional email via the Resend API (https://resend.com) —
 * just an API key once the sending domain is verified, no SDK dependency.
 * No-ops (with a console warning) when RESEND_API_KEY isn't set, so local
 * dev and demo deploys work without an email provider configured.
 */
export async function sendEmail(env: Env, input: SendEmailInput): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Email not sent (RESEND_API_KEY/EMAIL_FROM not configured):", input.subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend request failed (${res.status}): ${body}`);
  }
}

/** Sends the order confirmation email. Looked up fresh so it always reflects what was charged. */
export async function sendOrderConfirmationEmail(env: Env, order: any): Promise<void> {
  if (!order.customer_email) return;

  const store = order.store_id
    ? await env.DB.prepare(`SELECT name FROM stores WHERE id = ?`).bind(order.store_id).first<{ name: string }>()
    : null;

  const { results: items } = await env.DB.prepare(
    `SELECT product_name, quantity, unit_price FROM order_items WHERE order_id = ?`,
  )
    .bind(order.id)
    .all<{ product_name: string; quantity: number; unit_price: number }>();

  const trackUrl = buildTrackUrl(env, order.confirmation_number, order.customer_email);
  const { subject, html, text } = orderConfirmationEmail({
    order,
    items,
    storeName: store?.name || "Éclaire Atelier",
    trackUrl,
  });

  await sendEmail(env, { to: order.customer_email, subject, html, text });
}

function buildTrackUrl(env: Env, confirmationNumber: string | null, email: string): string | null {
  const base = (env.STOREFRONT_BASE_URL || "").replace(/\/+$/, "");
  if (!base || !confirmationNumber) return null;
  const params = new URLSearchParams({ confirmation: confirmationNumber, email });
  return `${base}/track-order?${params.toString()}`;
}
