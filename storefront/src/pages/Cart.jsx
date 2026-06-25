import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import { formatPrice } from "../api.js";

export default function Cart() {
  const {
    cart, changeQty, removeItem,
    demo, code, setCode, quote, quoteError, applyDiscount,
    checkout, checkoutBusy, checkoutError,
    currency, subtotal, total,
  } = useStore();

  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">Your Bag</span>
        <h1>Your Bag</h1>
      </section>

      <section className="section section--flush">
        {cart.length === 0 ? (
          <div className="empty-state">
            <p>Your bag is empty.</p>
            <p><Link className="btn btn-outline btn-hero" to="/shop">Explore the collection</Link></p>
          </div>
        ) : (
          <>
            <div className="bag-list">
              {cart.map((it) => (
                <div className="bag-row" key={it.key}>
                  <div className="bag-media" style={{ background: it.swatch || undefined }}>
                    {it.image && <img src={it.image} alt={it.name} />}
                  </div>
                  <div className="bag-info">
                    <p className="bag-name">{it.name}</p>
                    <p className="bag-spec">{it.length} · {it.width}</p>
                    <div className="bag-actions">
                      <div className="qty">
                        <button onClick={() => changeQty(it.key, -1)} aria-label="Decrease quantity">−</button>
                        <span>{it.qty}</span>
                        <button onClick={() => changeQty(it.key, 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <button className="bag-remove" onClick={() => removeItem(it.key)}>Remove</button>
                    </div>
                  </div>
                  <p className="bag-price">{formatPrice(it.price * it.qty, it.currency)}</p>
                </div>
              ))}
            </div>

            {!demo && (
              <form className="discount-form" onSubmit={(e) => { e.preventDefault(); applyDiscount(); }}>
                <label className="field">
                  Discount code
                  <input value={code} onChange={(e) => setCode(e.target.value)} />
                </label>
                <button className="btn btn-outline" type="submit">Apply</button>
                {quoteError && <p className="notice notice-error">{quoteError}</p>}
                {quote && quote.valid && quote.discount && <p className="notice notice-success">Applied: {quote.discount.code}</p>}
              </form>
            )}

            <div className="bag-summary">
              <p><span>Subtotal</span><span>{formatPrice(quote ? quote.original_amount : subtotal, currency)}</span></p>
              {quote && quote.discount_amount > 0 && <p><span>Discount</span><span>−{formatPrice(quote.discount_amount, currency)}</span></p>}
              <p><span>Shipping</span><span>{quote && quote.is_free_shipping ? "Free" : "Calculated at checkout"}</span></p>
              <p className="summary-total"><span>Total</span><span>{formatPrice(total, currency)}</span></p>
            </div>

            {checkoutError && <p className="notice notice-error">{checkoutError}</p>}
            {demo ? (
              <p className="notice">Checkout is unavailable in demo mode. Set VITE_API_BASE to enable live checkout.</p>
            ) : (
              <button className="btn btn-primary" onClick={checkout} disabled={checkoutBusy}>
                {checkoutBusy ? "Redirecting…" : "Checkout"}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
