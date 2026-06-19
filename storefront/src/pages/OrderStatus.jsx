import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { pollForOrder, formatPrice, trackingUrl } from "../api.js";

/* Order confirmation / status page — Stripe redirects here with ?session_id=. */
export default function OrderStatus() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const o = await pollForOrder(sessionId);
        if (alive) { setOrder(o); setLoading(false); }
      } catch (e) {
        if (alive) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [sessionId]);

  return (
    <main className="container order-status">
      <span className="label label--dot">Éclaire Atelier</span>
      <h1>Thank you</h1>
      <h2>Order status</h2>
      {!sessionId && <p className="notice">No order session found.</p>}
      {loading && sessionId && <p className="notice">Confirming your order…</p>}
      {error && !loading && <p className="notice notice-error">{error}</p>}
      {order && (
        <article>
          <p>Status: {order.status}</p>
          <p>Fulfillment: {order.fulfillment_status}</p>
          {order.customer_email && <p>A confirmation was sent to {order.customer_email}.</p>}
          <h3>Items</h3>
          <ul>
            {(order.items || []).map((it, i) => (
              <li key={it.id || i}>
                {it.product_name} × {it.quantity} — {formatPrice((it.unit_price ?? it.price) * it.quantity, order.currency)}
              </li>
            ))}
          </ul>
          <p>Total: {formatPrice(order.amount_total, order.currency)}</p>
          {order.tracking_number && (
            <p>
              Tracking ({order.shipping_carrier || "carrier"}):{" "}
              <a href={trackingUrl(order.shipping_carrier, order.tracking_number)} target="_blank" rel="noreferrer">
                {order.tracking_number}
              </a>
            </p>
          )}
          {order.shipping_address_line1 && (
            <address>
              {order.shipping_name}<br />
              {order.shipping_address_line1}{order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}<br />
              {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ""} {order.shipping_postal_code}<br />
              {order.shipping_country}
            </address>
          )}
        </article>
      )}
      <p><Link className="btn btn-outline btn-hero" to="/shop">Continue shopping</Link></p>
    </main>
  );
}
