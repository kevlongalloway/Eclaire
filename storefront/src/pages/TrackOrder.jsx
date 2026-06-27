import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import OrderSummary from "../components/OrderSummary.jsx";

/* No-account order lookup — reached from the footer, not the main nav.
   A confirmation-email link can prefill both fields via ?confirmation=&email=. */
export default function TrackOrder() {
  const [params] = useSearchParams();
  const [confirmationNumber, setConfirmationNumber] = useState(params.get("confirmation") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const o = await api.trackOrder(confirmationNumber.trim(), email.trim());
      setOrder(o);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container order-status">
      <span className="label label--dot">Éclaire Atelier</span>
      <h1>Track Your Order</h1>
      <h2>Enter your order number and email</h2>
      <p>
        Find your order number in your confirmation email — it looks like <strong>EC-XXXXXXXX</strong>.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field">
          Order number
          <input
            type="text"
            required
            placeholder="EC-7K2QXM9P"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
          />
        </label>
        <label className="field">
          Email
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Track Order"}
        </button>
      </form>

      {error && <p className="notice notice-error">{error}</p>}
      {order && <OrderSummary order={order} />}
    </main>
  );
}
