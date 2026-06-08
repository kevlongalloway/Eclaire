import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice, formatDate } from "../api";

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.getStats();
        if (alive) setStats(data);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <PageLoading title="Overview" />;
  if (error) return <PageError title="Overview" message={error} />;

  const cur = stats.currency || "usd";
  const cards = [
    { label: "Total revenue", value: formatPrice(stats.revenue_total, cur), sub: `${stats.order_count} orders` },
    { label: "Revenue · 30 days", value: formatPrice(stats.revenue_last_30d, cur), sub: `${stats.orders_last_30d} orders` },
    { label: "Avg. order value", value: formatPrice(stats.avg_order_value, cur), sub: `${stats.units_sold} units sold` },
    { label: "Unfulfilled", value: String(stats.unfulfilled_count), sub: "orders awaiting shipment", accent: stats.unfulfilled_count > 0 },
    { label: "Active products", value: String(stats.active_product_count), sub: `${stats.product_count} total` },
    { label: "Discounts given", value: formatPrice(stats.discounts_total, cur), sub: "lifetime" },
  ];

  return (
    <div className="ad-page">
      <header className="ad-page-head">
        <h1>Overview</h1>
        <p className="ad-page-sub">Store performance at a glance.</p>
      </header>

      <div className="ad-kpis">
        {cards.map((c) => (
          <div key={c.label} className={`ad-kpi${c.accent ? " is-accent" : ""}`}>
            <span className="ad-kpi-label">{c.label}</span>
            <span className="ad-kpi-value">{c.value}</span>
            <span className="ad-kpi-sub">{c.sub}</span>
          </div>
        ))}
      </div>

      <div className="ad-grid-2">
        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>Revenue · last 14 days</h2>
          </div>
          <RevenueChart daily={stats.daily} currency={cur} />
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>Recent orders</h2>
            <Link to="/orders" className="ad-link">View all</Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <p className="ad-empty">No orders yet.</p>
          ) : (
            <ul className="ad-recent">
              {stats.recent_orders.map((o) => (
                <li key={o.id}>
                  <div className="ad-recent-main">
                    <span className="ad-recent-email">{o.customer_email || "—"}</span>
                    <span className="ad-recent-date">{formatDate(o.created_at)}</span>
                  </div>
                  <div className="ad-recent-side">
                    <span className="ad-recent-amount">{formatPrice(o.amount_total, o.currency)}</span>
                    <span className={`ad-badge ad-badge-${o.fulfillment_status}`}>{o.fulfillment_status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RevenueChart({ daily, currency }) {
  if (!daily || daily.length === 0) return <p className="ad-empty">No paid orders in this window.</p>;
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  return (
    <div className="ad-chart">
      {daily.map((d) => (
        <div key={d.day} className="ad-bar-col" title={`${d.day}: ${formatPrice(d.revenue, currency)} · ${d.orders} orders`}>
          <div className="ad-bar" style={{ height: `${Math.max(4, (d.revenue / max) * 100)}%` }} />
          <span className="ad-bar-label">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ title }) {
  return (
    <div className="ad-page">
      <header className="ad-page-head"><h1>{title}</h1></header>
      <div className="ad-loading">Loading…</div>
    </div>
  );
}

export function PageError({ title, message }) {
  return (
    <div className="ad-page">
      <header className="ad-page-head"><h1>{title}</h1></header>
      <div className="ad-form-error ad-block-error">{message}</div>
    </div>
  );
}
