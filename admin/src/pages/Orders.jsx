import { useCallback, useEffect, useState } from "react";
import { api, formatPrice, formatDate } from "../api";
import Modal from "../components/Modal.jsx";
import { PageError } from "./Overview.jsx";

const FILTERS = ["", "unfulfilled", "processing", "shipped", "delivered"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (fulfillment_status = "") => {
    setLoading(true);
    setError("");
    try {
      setOrders(await api.listOrders({ fulfillment_status }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  function onUpdated(updated) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    setSelected(updated);
    if (filter && updated.fulfillment_status !== filter) load(filter);
  }

  if (error && !orders.length) return <PageError title="Orders" message={error} />;

  return (
    <div className="ad-page">
      <header className="ad-page-head">
        <h1>Orders</h1>
        <p className="ad-page-sub">{orders.length} order{orders.length === 1 ? "" : "s"}</p>
      </header>

      <div className="ad-toolbar">
        <div className="ad-tabs">
          {FILTERS.map((f) => (
            <button
              key={f || "all"}
              className={`ad-tab${filter === f ? " is-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ad-form-error">{error}</p>}

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="ad-td-center">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="ad-td-center ad-empty">No orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="ad-row-clickable" onClick={() => setSelected(o)}>
                  <td className="ad-cell-id">{o.id.slice(0, 14)}…</td>
                  <td>{o.customer_email || "—"}</td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>{formatPrice(o.amount_total, o.currency)}</td>
                  <td><span className={`ad-badge ad-badge-${o.status}`}>{o.status}</span></td>
                  <td><span className={`ad-badge ad-badge-${o.fulfillment_status}`}>{o.fulfillment_status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDetail orderSummary={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />
      )}
    </div>
  );
}

const FULFILLMENT = ["unfulfilled", "processing", "shipped", "delivered"];
const PAYMENT = ["paid", "pending", "refunded", "cancelled"];
const CARRIERS = ["", "USPS", "UPS", "FedEx", "DHL"];

function OrderDetail({ orderSummary, onClose, onUpdated }) {
  const [order, setOrder] = useState(orderSummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // form state
  const [fulfillment, setFulfillment] = useState(orderSummary.fulfillment_status);
  const [status, setStatus] = useState(orderSummary.status);
  const [carrier, setCarrier] = useState(orderSummary.shipping_carrier || "");
  const [service, setService] = useState(orderSummary.shipping_service || "");
  const [tracking, setTracking] = useState(orderSummary.tracking_number || "");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const full = await api.getOrder(orderSummary.id);
        if (!alive) return;
        setOrder(full);
        setFulfillment(full.fulfillment_status);
        setStatus(full.status);
        setCarrier(full.shipping_carrier || "");
        setService(full.shipping_service || "");
        setTracking(full.tracking_number || "");
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderSummary.id]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await api.updateOrder(order.id, {
        fulfillment_status: fulfillment,
        status,
        shipping_carrier: carrier || null,
        shipping_service: service || null,
        tracking_number: tracking || null,
      });
      setOrder(updated);
      onUpdated(updated);
      setNotice("Order updated.");
      setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const cur = order.currency || "usd";

  return (
    <Modal title={`Order ${order.id.slice(0, 16)}…`} onClose={onClose} wide>
      {loading ? (
        <div className="ad-loading">Loading…</div>
      ) : (
        <div className="ad-order">
          <div className="ad-order-cols">
            <section>
              <h3 className="ad-order-h">Items</h3>
              <ul className="ad-order-items">
                {(order.items || []).map((it, i) => (
                  <li key={i}>
                    <span>{it.product_name} × {it.quantity}</span>
                    <span>{formatPrice(it.unit_price * it.quantity, cur)}</span>
                  </li>
                ))}
              </ul>
              <div className="ad-order-totals">
                <div><span>Subtotal</span><span>{formatPrice(order.amount_subtotal, cur)}</span></div>
                {order.amount_discount > 0 && (
                  <div className="is-discount">
                    <span>Discount{order.discount_code ? ` (${order.discount_code})` : ""}</span>
                    <span>−{formatPrice(order.amount_discount, cur)}</span>
                  </div>
                )}
                <div className="ad-order-total"><span>Total</span><span>{formatPrice(order.amount_total, cur)}</span></div>
              </div>
            </section>

            <section>
              <h3 className="ad-order-h">Customer</h3>
              <p className="ad-order-meta">{order.customer_email || "—"}</p>
              <h3 className="ad-order-h">Ship to</h3>
              {order.shipping_address_line1 ? (
                <address className="ad-order-meta">
                  {order.shipping_name}<br />
                  {order.shipping_address_line1}{order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}<br />
                  {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ""} {order.shipping_postal_code}<br />
                  {order.shipping_country}
                </address>
              ) : (
                <p className="ad-order-meta">No shipping address.</p>
              )}
              <p className="ad-order-meta ad-order-date">Placed {formatDate(order.created_at)}</p>
            </section>
          </div>

          <form className="ad-order-form" onSubmit={onSave}>
            <h3 className="ad-order-h">Update</h3>
            <div className="ad-form-row">
              <label className="ad-field ad-field-sm">
                <span>Payment</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {PAYMENT.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="ad-field ad-field-sm">
                <span>Fulfillment</span>
                <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
                  {FULFILLMENT.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="ad-field ad-field-sm">
                <span>Carrier</span>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                  {CARRIERS.map((s) => <option key={s || "none"} value={s}>{s || "—"}</option>)}
                </select>
              </label>
            </div>
            <div className="ad-form-row">
              <label className="ad-field">
                <span>Service</span>
                <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Priority Mail" />
              </label>
              <label className="ad-field ad-grow">
                <span>Tracking number</span>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="9400…" />
              </label>
            </div>

            {error && <p className="ad-form-error">{error}</p>}
            <div className="ad-form-actions">
              {notice && <span className="ad-notice">{notice}</span>}
              <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
