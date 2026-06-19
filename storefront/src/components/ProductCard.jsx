import React from "react";
import { Link } from "react-router-dom";
import { formatPrice, getPrimaryImage } from "../api.js";

/* Grid card — browse only. Clicking opens the product's own page, where the
   length/width are chosen and the piece is added to the bag. */
export default function ProductCard({ group }) {
  const img = getPrimaryImage(group);
  return (
    <li>
      <Link className="product-card" to={`/product/${encodeURIComponent(group.key)}`}>
        <div className={`product-media${img ? "" : " product-media-empty"}`}>
          {img && <img src={img} alt={`${group.name} — sterling silver catching the light`} />}
        </div>
        {group.tag && <span className="product-tag">{group.tag}</span>}
        <h3>{group.name}</h3>
        {(group.collection || group.metal) && (
          <p className="meta">{group.collection}{group.collection && group.metal ? " · " : ""}{group.metal}</p>
        )}
        <p className="price">{formatPrice(group.price, group.currency)}</p>
      </Link>
    </li>
  );
}
