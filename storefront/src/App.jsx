import React, { useState, useEffect, useCallback } from "react";
import {
  api,
  pollForOrder,
  buildCatalog,
  formatPrice,
  getPrimaryImage,
  trackingUrl,
  API_CONFIGURED,
} from "./api.js";

/* ============================================================================
   Éclaire Atelier — storefront.
   Unstyled: plain semantic HTML only (no CSS, no classes, no inline styles).
   ============================================================================ */

/* Demo fallback catalog (used when no API is configured). */
const MOCK_PRODUCTS = [
  {
    id: "lumiere-rope", name: "Lumière Rope Chain", price: 24800, currency: "usd",
    images: [], stock: -1, active: true,
    description: "A tightly woven rope that throws light in every direction.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '20"', default_width: "3mm" },
  },
  {
    id: "clair-cuban", name: "Clair Cuban Link", price: 31200, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Hand-polished interlocking links with real heft.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '22"', default_width: "5mm" },
  },
  {
    id: "halo-box", name: "Halo Box Chain", price: 19600, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Clean geometric links that sit flat and catch a sharp glint.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '18"', default_width: "2mm" },
  },
];

/* Collapse cart lines into API line items keyed by productId. */
function aggregateItems(cart, withPrice) {
  const byId = new Map();
  for (const l of cart) {
    const ex = byId.get(l.productId);
    if (ex) ex.quantity += l.qty;
    else byId.set(l.productId, withPrice
      ? { productId: l.productId, price: l.price, quantity: l.qty }
      : { productId: l.productId, quantity: l.qty });
  }
  return [...byId.values()];
}

/* A single product with its length/width selection. */
function ProductItem({ group, onAdd }) {
  const [length, setLength] = useState(group.defaultLength);
  const [width, setWidth] = useState(group.defaultWidth);
  const resolved = group.resolve(length, width);
  const price = resolved && resolved.price != null ? resolved.price : group.price;
  const unavailable = !resolved || resolved.available === false;
  const img = getPrimaryImage(group);

  return (
    <li>
      <article>
        <h3>{group.name}</h3>
        {img && <img src={img} alt={group.name} />}
        <p>{formatPrice(price, group.currency)}</p>
        {(group.collection || group.metal) && (
          <p>{group.collection}{group.collection && group.metal ? " — " : ""}{group.metal}</p>
        )}
        {group.desc && <p>{group.desc}</p>}
        <form onSubmit={(e) => { e.preventDefault(); if (!unavailable) onAdd(group, length, width); }}>
          {group.lengths && group.lengths.length > 0 && (
            <p>
              <label>
                Length{" "}
                <select value={length} onChange={(e) => setLength(e.target.value)}>
                  {group.lengths.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </p>
          )}
          {group.widths && group.widths.length > 0 && (
            <p>
              <label>
                Width{" "}
                <select value={width} onChange={(e) => setWidth(e.target.value)}>
                  {group.widths.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            </p>
          )}
          <p>
            <button type="submit" disabled={unavailable}>
              {unavailable ? "Unavailable" : "Add to bag"}
            </button>
          </p>
        </form>
      </article>
    </li>
  );
}

/* Order confirmation / status page (shown when ?session_id= is present). */
function OrderStatus({ sessionId, onBack }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <main>
      <h1>Éclaire Atelier</h1>
      <h2>Order status</h2>
      {loading && <p>Confirming your order…</p>}
      {error && !loading && <p>{error}</p>}
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
      <p><button onClick={onBack}>Continue shopping</button></p>
    </main>
  );
}

export default function App() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(!API_CONFIGURED);
  const [loadError, setLoadError] = useState(null);

  const [cart, setCart] = useState([]);
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const [sessionId, setSessionId] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("session_id"));

  /* Load catalog. */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const products = API_CONFIGURED ? await api.listAllProducts() : MOCK_PRODUCTS;
        if (!alive) return;
        setGroups(buildCatalog(products));
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setGroups(buildCatalog(MOCK_PRODUCTS));
        setDemo(true);
        setLoadError(e.message);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const addToCart = useCallback((group, length, width) => {
    const resolved = group.resolve(length, width);
    if (!resolved || resolved.available === false) return;
    const productId = resolved.productId;
    const price = resolved.price != null ? resolved.price : group.price;
    const key = `${productId}|${length}|${width}`;
    setCart((c) => {
      const ex = c.find((i) => i.key === key);
      if (ex) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { key, productId, name: group.name, length, width, price, currency: group.currency, qty: 1 }];
    });
    setQuote(null); setQuoteError(null);
  }, []);

  const changeQty = (key, d) => {
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
    setQuote(null); setQuoteError(null);
  };
  const removeItem = (key) => {
    setCart((c) => c.filter((i) => i.key !== key));
    setQuote(null); setQuoteError(null);
  };

  const applyDiscount = useCallback(async () => {
    if (demo || cart.length === 0) return;
    setQuoteError(null);
    try {
      const items = aggregateItems(cart, true);
      const data = await api.validateDiscount(code.trim() || undefined, items);
      if (code.trim() && data.valid === false) setQuoteError(data.error || "That code can’t be applied.");
      setQuote(data);
    } catch (e) {
      setQuoteError(e.message);
    }
  }, [cart, code, demo]);

  const checkout = useCallback(async () => {
    if (demo || cart.length === 0) return;
    setCheckoutBusy(true); setCheckoutError(null);
    try {
      const items = aggregateItems(cart, false);
      const base = window.location.origin + window.location.pathname;
      const data = await api.createCheckoutSession({
        items,
        successUrl: `${base}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: base,
        discountCode: quote && quote.valid && quote.discount ? quote.discount.code : undefined,
      });
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e.message);
      setCheckoutBusy(false);
    }
  }, [cart, demo, quote]);

  if (sessionId) {
    return (
      <OrderStatus
        sessionId={sessionId}
        onBack={() => {
          window.history.replaceState({}, "", window.location.origin + window.location.pathname);
          setSessionId(null);
        }}
      />
    );
  }

  const currency = cart[0]?.currency || "usd";
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = quote ? quote.final_amount : subtotal;
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      <header>
        <h1>Éclaire Atelier</h1>
        <p>Jewelry that catches the light. Solid 925 sterling silver, hand-finished in the atelier, weighted to last.</p>
        <nav>
          <a href="#shop">Shop</a>{" | "}
          <a href="#story">Atelier</a>{" | "}
          <a href="#bag">Bag ({count})</a>
        </nav>
      </header>

      <hr />

      <main>
        {demo && (
          <p>Demo mode — showing sample products.{loadError ? ` (API error: ${loadError})` : ""} Set VITE_API_BASE to connect the live store.</p>
        )}

        <section id="shop">
          <h2>The Collection</h2>
          {loading ? (
            <p>Loading the collection…</p>
          ) : groups.length === 0 ? (
            <p>No pieces yet.</p>
          ) : (
            <ul>
              {groups.map((g) => <ProductItem key={g.key} group={g} onAdd={addToCart} />)}
            </ul>
          )}
        </section>

        <hr />

        <section id="story">
          <h2>Our Story</h2>
          <p>We begin with solid 925 sterling silver of exceptional quality and weight, crafted so it sparkles with genuine brilliance and feels like an heirloom from the very first wear.</p>
          <p>Éclaire Atelier is not defined by one metal. Over time we’ll introduce collections in gold and beyond — but we’ll always be defined by the way our jewelry makes you feel when you wear it.</p>
          <p>— The Éclaire Atelier</p>
        </section>

        <hr />

        <section id="bag">
          <h2>Your Bag</h2>
          {cart.length === 0 ? (
            <p>Your bag is empty.</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Options</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((it) => (
                    <tr key={it.key}>
                      <td>{it.name}</td>
                      <td>{it.length} / {it.width}</td>
                      <td>
                        <button onClick={() => changeQty(it.key, -1)} aria-label="Decrease quantity">−</button>
                        {" "}{it.qty}{" "}
                        <button onClick={() => changeQty(it.key, 1)} aria-label="Increase quantity">+</button>
                      </td>
                      <td>{formatPrice(it.price * it.qty, it.currency)}</td>
                      <td><button onClick={() => removeItem(it.key)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!demo && (
                <form onSubmit={(e) => { e.preventDefault(); applyDiscount(); }}>
                  <label>
                    Discount code{" "}
                    <input value={code} onChange={(e) => setCode(e.target.value)} />
                  </label>
                  {" "}
                  <button type="submit">Apply</button>
                  {quoteError && <p>{quoteError}</p>}
                  {quote && quote.valid && quote.discount && <p>Applied: {quote.discount.code}</p>}
                </form>
              )}

              <p>Subtotal: {formatPrice(quote ? quote.original_amount : subtotal, currency)}</p>
              {quote && quote.discount_amount > 0 && <p>Discount: −{formatPrice(quote.discount_amount, currency)}</p>}
              <p>Shipping: {quote && quote.is_free_shipping ? "Free" : "Calculated at checkout"}</p>
              <p>Total: {formatPrice(total, currency)}</p>

              {checkoutError && <p>{checkoutError}</p>}
              {demo ? (
                <p>Checkout is unavailable in demo mode. Set VITE_API_BASE to enable live checkout.</p>
              ) : (
                <p>
                  <button onClick={checkout} disabled={checkoutBusy}>
                    {checkoutBusy ? "Redirecting…" : "Checkout"}
                  </button>
                </p>
              )}
            </>
          )}
        </section>
      </main>

      <hr />

      <footer>
        <p>© {new Date().getFullYear()} Éclaire Atelier</p>
      </footer>
    </>
  );
}
