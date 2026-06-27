import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { pollForOrder } from "../api.js";
import OrderSummary from "../components/OrderSummary.jsx";

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
      {order && <OrderSummary order={order} />}
      <p><Link className="btn btn-outline btn-hero" to="/shop">Continue shopping</Link></p>
      <p><Link to="/track-order">Look up an order later</Link></p>
    </main>
  );
}
