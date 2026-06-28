import React from "react";
import { Link } from "react-router-dom";
import { formatPrice, trackingUrl } from "../api.js";

/* Shared order details block — used by the post-checkout success page and
   the no-account "Track Your Order" lookup. */
export default function OrderSummary({ order }) {
  const trackHref =
    order.confirmation_number && order.customer_email
      ? `/track-order?${new URLSearchParams({
          confirmation: order.confirmation_number,
          email: order.customer_email,
        }).toString()}`
      : null;

  return (
    <article>
      {order.confirmation_number && (
        <p className="notice order-confirmation-number">
          Your order number is <strong>{order.confirmation_number}</strong> — save this and your
          email to look up your order later.
        </p>
      )}
      <p>Status: {order.status}</p>
      <p>Fulfillment: {order.fulfillment_status}</p>
      {order.customer_email && <p>A confirmation was sent to {order.customer_email}.</p>}
      {trackHref && (
        <p>
          <Link to={trackHref}>Track this order</Link>
        </p>
      )}
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
  );
}
