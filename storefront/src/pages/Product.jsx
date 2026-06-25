import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import { formatPrice, resolveImageUrl } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";

export default function Product() {
  const { key } = useParams();
  const { groups, loading, addToCart } = useStore();
  const group = useMemo(() => groups.find((g) => g.key === key), [groups, key]);

  if (loading) {
    return <main className="container product-page"><p className="empty-state">Loading…</p></main>;
  }

  if (!group) {
    return (
      <main className="container product-page">
        <p className="empty-state">We couldn’t find that piece.</p>
        <p><Link className="btn btn-outline btn-hero" to="/shop">Back to the collection</Link></p>
      </main>
    );
  }

  return <ProductDetail group={group} addToCart={addToCart} related={groups.filter((g) => g.key !== key).slice(0, 4)} />;
}

function ProductDetail({ group, addToCart, related }) {
  const [length, setLength] = useState(group.defaultLength);
  const [width, setWidth] = useState(group.defaultWidth);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const resolved = group.resolve(length, width);
  const price = resolved && resolved.price != null ? resolved.price : group.price;
  const unavailable = !resolved || resolved.available === false;
  const images = (group.images || []).map(resolveImageUrl).filter(Boolean);
  const img = images[activeImg] || images[0] || null;

  const onSubmit = (e) => {
    e.preventDefault();
    if (unavailable) return;
    addToCart(group, length, width, qty);
    setAdded(true);
    setQty(1);
    window.setTimeout(() => setAdded(false), 2400);
  };

  return (
    <main className="container product-page">
      <p className="breadcrumb">
        <Link to="/shop">Shop</Link> <span aria-hidden="true">/</span> {group.name}
      </p>

      <div className="product-detail">
        <div className="pdp-gallery">
          <div className="pdp-main" style={{ "--swatch": group.swatch }}>
            {img ? (
              <img src={img} alt={`${group.name} — sterling silver catching the light`} />
            ) : (
              <div className="silver-surface">
                <span className="mark">925</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbs">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`pdp-thumb${i === activeImg ? " active" : ""}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={src} alt={`${group.name} view ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          {group.collection && <span className="label label--dot">{group.collection}</span>}
          <h1>{group.name}</h1>
          <p className="price price--lg">{formatPrice(price, group.currency)}</p>
          {group.desc && <p className="product-desc">{group.desc}</p>}

          <form className="product-config" onSubmit={onSubmit}>
            {group.lengths && group.lengths.length > 0 && (
              <label className="field">
                Length
                <select value={length} onChange={(e) => setLength(e.target.value)}>
                  {group.lengths.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            )}
            {group.widths && group.widths.length > 0 && (
              <label className="field">
                Width
                <select value={width} onChange={(e) => setWidth(e.target.value)}>
                  {group.widths.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            )}
            <div className="qty pdp-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className="btn btn-primary" type="submit" disabled={unavailable}>
              {unavailable ? "Unavailable" : added ? "Added to bag ✓" : "Add to bag"}
            </button>
            {added && <p className="notice notice-success">Added to your bag. <Link to="/cart">View bag →</Link></p>}
          </form>

          <dl className="spec-list">
            <div><dt>Material</dt><dd>{group.metal || "Solid 925 Sterling Silver"}</dd></div>
            <div><dt>Length</dt><dd>{length}</dd></div>
            <div><dt>Width</dt><dd>{width}</dd></div>
            {group.weight && <div><dt>Approx. Weight</dt><dd>{group.weight}</dd></div>}
            <div><dt>Finish</dt><dd>Hand-finished in the atelier</dd></div>
          </dl>

          <div className="trust">
            <div className="t-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Solid 925 — never plated
            </div>
            <div className="t-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Hand-finished in the atelier
            </div>
            <div className="t-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Designed to be worn and loved for years
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="label label--dot">Complete the light</span>
            <h2>You may also like</h2>
          </div>
          <ul className="product-grid">
            {related.map((g) => <ProductCard key={g.key} group={g} />)}
          </ul>
        </section>
      )}
    </main>
  );
}
