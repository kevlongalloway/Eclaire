interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number; // cents
}

interface OrderConfirmationInput {
  order: {
    confirmation_number: string | null;
    customer_email: string | null;
    shipping_name?: string | null;
    shipping_address_line1?: string | null;
    shipping_address_line2?: string | null;
    shipping_city?: string | null;
    shipping_state?: string | null;
    shipping_postal_code?: string | null;
    shipping_country?: string | null;
    amount_subtotal: number;
    amount_discount: number;
    amount_total: number;
    currency: string;
    created_at: string;
  };
  items: OrderItem[];
  storeName: string;
  trackUrl: string | null;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((cents || 0) / 100);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** Builds the order confirmation email — sent once, right after a successful checkout. */
export function orderConfirmationEmail({ order, items, storeName, trackUrl }: OrderConfirmationInput) {
  const orderNumber = order.confirmation_number || "—";
  const subject = `${storeName} — order confirmed (${orderNumber})`;

  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;">${escapeHtml(it.product_name)} × ${it.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-size:14px;text-align:right;">${money(it.unit_price * it.quantity, order.currency)}</td>
        </tr>`,
    )
    .join("");

  const itemLines = items.map((it) => `  ${it.product_name} x${it.quantity} — ${money(it.unit_price * it.quantity, order.currency)}`).join("\n");

  const address =
    order.shipping_address_line1
      ? [
          order.shipping_name,
          order.shipping_address_line1,
          order.shipping_address_line2,
          [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
          order.shipping_country,
        ]
          .filter(Boolean)
          .join("\n")
      : null;

  const trackButton = trackUrl
    ? `<tr><td style="padding:24px 0 0;text-align:center;">
         <a href="${trackUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:.04em;text-transform:uppercase;padding:14px 28px;border-radius:2px;">Track Your Order</a>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f5f3;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f3;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 0;text-align:center;">
                <span style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8a8a;">${escapeHtml(storeName)}</span>
                <h1 style="font-size:26px;font-weight:400;margin:12px 0 4px;color:#1a1a1a;">Thank you for your order</h1>
                <p style="font-size:14px;color:#5a5a5a;margin:0 0 24px;">Order ${escapeHtml(orderNumber)} · ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                  <tr>
                    <td style="padding:14px 0 0;font-size:14px;color:#5a5a5a;">Subtotal</td>
                    <td style="padding:14px 0 0;font-size:14px;color:#5a5a5a;text-align:right;">${money(order.amount_subtotal, order.currency)}</td>
                  </tr>
                  ${
                    order.amount_discount
                      ? `<tr>
                    <td style="padding:4px 0 0;font-size:14px;color:#5a5a5a;">Discount</td>
                    <td style="padding:4px 0 0;font-size:14px;color:#5a5a5a;text-align:right;">−${money(order.amount_discount, order.currency)}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding:8px 0 0;font-size:16px;color:#1a1a1a;font-weight:bold;">Total</td>
                    <td style="padding:8px 0 0;font-size:16px;color:#1a1a1a;font-weight:bold;text-align:right;">${money(order.amount_total, order.currency)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${
              address
                ? `<tr>
              <td style="padding:28px 40px 0;">
                <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8a;margin:0 0 6px;">Shipping to</p>
                <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;white-space:pre-line;">${escapeHtml(address)}</p>
              </td>
            </tr>`
                : ""
            }
            ${trackButton}
            <tr>
              <td style="padding:32px 40px 40px;text-align:center;">
                <p style="font-size:12px;color:#8a8a8a;margin:0;">Keep this email — your order number is your key to checking status without an account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${storeName} — order confirmed

Order ${orderNumber} · ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${itemLines}

Subtotal: ${money(order.amount_subtotal, order.currency)}
${order.amount_discount ? `Discount: -${money(order.amount_discount, order.currency)}\n` : ""}Total: ${money(order.amount_total, order.currency)}
${address ? `\nShipping to:\n${address}\n` : ""}
${trackUrl ? `Track your order: ${trackUrl}\n` : ""}
Keep this email — your order number is your key to checking status without an account.`;

  return { subject, html, text };
}
