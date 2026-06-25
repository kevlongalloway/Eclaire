import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import { formatPrice } from "../api.js";

export default function CartDrawer() {
  const { cart, cartOpen, closeCart, changeQty, removeItem, subtotal, currency, demo } = useStore();

  return (
    <>
      <div className={`scrim${cartOpen ? " open" : ""}`} onClick={closeCart} />
      <aside className={`drawer${cartOpen ? " open" : ""}`} aria-hidden={!cartOpen}>
        <div className="drawer-head">
          <h3>Your Bag</h3>
          <button className="icon-btn" onClick={closeCart} aria-label="Close bag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="drawer-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7a3 3 0 1 1 6 0" />
              </svg>
              <p>Your bag is empty.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.key}>
                <div className="ci-media" style={{ background: item.swatch || undefined }}>
                  {item.image && <img src={item.image} alt={item.name} />}
                </div>
                <div className="ci-info">
                  <span className="ci-name">{item.name}</span>
                  <span className="ci-spec">{item.length} · {item.width}</span>
                  <div className="ci-foot">
                    <div className="qty">
                      <button onClick={() => changeQty(item.key, -1)} aria-label="Decrease quantity">−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeQty(item.key, 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <span className="ci-price">{formatPrice(item.price * item.qty, item.currency)}</span>
                  </div>
                  <button className="btn-link" onClick={() => removeItem(item.key)} style={{ marginTop: 4 }}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-foot">
            <div className="totals">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="totals grand">
              <span>Estimated total</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <Link className="btn btn-primary btn-hero" to="/cart" onClick={closeCart} style={{ width: "100%" }}>
              {demo ? "View Bag" : "Checkout"}
            </Link>
            <Link className="drawer-view-bag" to="/cart" onClick={closeCart}>
              View full bag
            </Link>
            <p className="ship-note">Free shipping on every order.</p>
          </div>
        )}
      </aside>
    </>
  );
}
