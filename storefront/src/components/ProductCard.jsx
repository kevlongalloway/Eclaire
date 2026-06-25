import React from "react";
import { Link } from "react-router-dom";
import { formatPrice, getPrimaryImage, stockBadge } from "../api.js";
import { useStore } from "../store.jsx";

export default function ProductCard({ group }) {
  const { addToCart } = useStore();
  const img = getPrimaryImage(group);
  const resolved = group.resolve(group.defaultLength, group.defaultWidth);
  const badge = resolved ? stockBadge(resolved.stock) : null;
  const soldOut = resolved ? resolved.available === false : false;

  function handleQuickAdd(e) {
    e.preventDefault();
    addToCart(group, group.defaultLength, group.defaultWidth, 1);
  }

  return (
    <li>
      <Link className="product-card spark-trigger" to={`/product/${encodeURIComponent(group.key)}`}>
        <div className="product-media" style={{ "--swatch": group.swatch }}>
          {img ? (
            <img src={img} alt={`${group.name} — sterling silver catching the light`} />
          ) : (
            <div className="silver-surface">
              <span className="mark">925</span>
            </div>
          )}
          {(group.tag || badge) && <span className="product-tag">{group.tag || badge}</span>}
          <button className="card-add" onClick={handleQuickAdd} disabled={soldOut}>
            {soldOut ? "Sold Out" : "Quick Add"}
          </button>
        </div>
        <div className="card-meta-row">
          <h3>{group.name}</h3>
          <p className="price">{formatPrice(group.price, group.currency)}</p>
        </div>
        {(group.collection || group.metal) && (
          <p className="spec">{group.collection}{group.collection && group.metal ? " · " : ""}{group.metal}</p>
        )}
      </Link>
    </li>
  );
}
