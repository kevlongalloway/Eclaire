import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  api,
  pollForOrder,
  buildCatalog,
  formatPrice,
  getPrimaryImage,
  stockBadge,
  trackingUrl,
  API_CONFIGURED,
} from "./api.js";

/* ============================================================================
   ÉCLAIRE — Luxury Jewelry Storefront
   ----------------------------------------------------------------------------
   Wired to the E-commaxxing API. Configure VITE_API_BASE to point at your
   worker (see .env.example). With no API configured the app runs in DEMO MODE
   on the mock catalog below — products render, but checkout and discount codes
   are disabled (there are no real product IDs to send).

   Money is always an integer in the smallest currency unit (cents).

   Length (inches) + width (mm) variations: see api.js → buildCatalog for how
   they map onto the backend. Pattern B (one product per length×width combo,
   linked by metadata.base_product) captures the dimensions on the order.
   Pattern A (single product, metadata.lengths/widths) treats them as
   display-only and passes the selection through the success URL.
   ============================================================================ */

/* ---------------------------------- DATA ---------------------------------- */
/* DEMO fallback only. Shape matches the API Product schema (price in cents,
   variations under metadata.lengths/metadata.widths — Pattern A). When
   VITE_API_BASE is set this is replaced by GET /products. */
const MOCK_PRODUCTS = [
  {
    id: "lumiere-rope", name: "Lumière Rope Chain", price: 24800, currency: "usd",
    images: [], stock: -1, active: true,
    description: "A tightly woven rope that throws light in every direction. Substantial on the skin, quietly assured.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "18.4g", swatch: "#C8CCD2", tag: "Bestseller", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '20"', default_width: "3mm" },
  },
  {
    id: "clair-cuban", name: "Clair Cuban Link", price: 31200, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Hand-polished interlocking links with real heft. The piece that anchors a wardrobe.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "26.1g", swatch: "#B9BEC6", tag: "New", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '22"', default_width: "5mm" },
  },
  {
    id: "halo-box", name: "Halo Box Chain", price: 19600, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Clean geometric links that sit flat and catch a sharp, architectural glint.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "11.2g", swatch: "#CDD2D8", tag: null, lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '18"', default_width: "2mm" },
  },
  {
    id: "serein-figaro", name: "Serein Figaro", price: 22400, currency: "usd",
    images: [], stock: -1, active: true,
    description: "The rhythm of alternating links — a timeless pattern, weighted for the everyday.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "15.8g", swatch: "#C2C7CE", tag: null, lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '20"', default_width: "4mm" },
  },
  {
    id: "etoile-snake", name: "Étoile Snake Chain", price: 17800, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Liquid-smooth and fluid, it moves like mercury and reads as pure light.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "9.6g", swatch: "#D1D5DA", tag: null, lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '18"', default_width: "2mm" },
  },
  {
    id: "aube-curb", name: "Aube Curb Chain", price: 26800, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Flattened, twisted links polished to a mirror. Bold without ever shouting.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", weight: "21.0g", swatch: "#BEC3CB", tag: "Bestseller", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '22"', default_width: "4mm" },
  },
];

/* Collapse cart lines into API line items keyed by productId. Under Pattern A
   several sizes share one productId, so their quantities must be summed before
   they're sent to /checkout/session and /discounts/validate. */
function aggregateItems(cart, withPrice) {
  const byId = new Map();
  for (const l of cart) {
    const existing = byId.get(l.productId);
    if (existing) existing.quantity += l.qty;
    else byId.set(l.productId, withPrice
      ? { productId: l.productId, price: l.price, quantity: l.qty }
      : { productId: l.productId, quantity: l.qty });
  }
  return [...byId.values()];
}

/* --------------------------------- ICONS ---------------------------------- */
const Icon = {
  Spark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 2c.4 5.3 4.3 9.2 9.6 9.6-5.3.4-9.2 4.3-9.6 9.6-.4-5.3-4.3-9.2-9.6-9.6C7.7 11.2 11.6 7.3 12 2Z"
        fill="currentColor" />
    </svg>
  ),
  Bag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Minus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  Leaf: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M5 19c0-7 5-12 14-13-1 9-6 14-13 14-1 0-1-1-1-1Z" strokeLinejoin="round" />
      <path d="M9 15c2-2 4-3 7-4" strokeLinecap="round" />
    </svg>
  ),
  Gem: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M7 4h10l4 6-9 11L3 10l4-6Z" strokeLinejoin="round" />
      <path d="M3 10h18M9 4l-2 6 5 11M15 4l2 6-5 11" strokeLinejoin="round" />
    </svg>
  ),
  Hand: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v7c0 4-3 7-7 7s-6-3-7-5l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="m5 12 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Truck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
    </svg>
  ),
};

/* ----------------------- PRODUCT VISUAL (CSS render) ---------------------- */
/* A luminous abstract "chain on light" tile — used when a product has no
   photography. Each product gets a unique drape based on its id. */
function ProductVisual({ product, hover }) {
  const links = 11;
  const seedShift = (product.id.charCodeAt(0) % 5) - 2;
  return (
    <div className="ec-visual">
      <div className="ec-visual-glow" />
      <svg viewBox="0 0 200 240" className="ec-visual-svg" aria-hidden>
        <defs>
          <linearGradient id={`g-${product.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.45" stopColor={product.swatch} />
            <stop offset="0.75" stopColor="#7d828c" />
            <stop offset="1" stopColor="#3c4049" />
          </linearGradient>
          <radialGradient id={`s-${product.id}`} cx="0.5" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: links }).map((_, i) => {
          const t = i / (links - 1);
          const x = 100 + Math.sin(t * Math.PI) * (38 + seedShift * 4) * (i % 2 ? 1 : -1) * 0.5;
          const y = 28 + t * 184;
          return (
            <g key={i} style={{ transform: hover ? `translateY(${Math.sin(t * 6) * 2}px)` : "none", transition: "transform .6s ease" }}>
              <ellipse cx={x} cy={y} rx="15" ry="9.5" fill="none"
                stroke={`url(#g-${product.id})`} strokeWidth="5.5"
                transform={`rotate(${i % 2 ? 32 : -32} ${x} ${y})`} />
              <ellipse cx={x - 2} cy={y - 2} rx="6" ry="3" fill={`url(#s-${product.id})`}
                transform={`rotate(${i % 2 ? 32 : -32} ${x} ${y})`} />
            </g>
          );
        })}
      </svg>
      <span className="ec-visual-sheen" />
    </div>
  );
}

/* Renders real photography when present, otherwise the CSS visual. */
function Tile({ id, swatch, image, name, hover = false }) {
  if (image) {
    return (
      <div className="ec-visual">
        <img className="ec-visual-img" src={image} alt={name || ""} loading="lazy" />
      </div>
    );
  }
  return <ProductVisual product={{ id, swatch }} hover={hover} />;
}

/* -------------------------------- HEADER ---------------------------------- */
function Header({ count, onCart, onSearch, onNav, scrolled }) {
  return (
    <header className={`ec-header ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="ec-header-nav">
        <button className="ec-nav-link" onClick={() => onNav("shop")}>Shop</button>
        <button className="ec-nav-link ec-hide-sm" onClick={() => onNav("story")}>Atelier</button>
      </nav>
      <button className="ec-logo" onClick={() => onNav("top")} aria-label="Éclaire home">Éclaire</button>
      <div className="ec-header-actions">
        <button className="ec-nav-link ec-hide-sm" onClick={onSearch}>Search</button>
        <button className="ec-nav-link ec-bag" onClick={onCart}>
          Bag{count > 0 && <sup>{count}</sup>}
        </button>
      </div>
    </header>
  );
}

/* --------------------------------- HERO ----------------------------------- */
function Hero({ onShop, featured }) {
  return (
    <section className="ec-hero">
      <div className="ec-hero-bg" aria-hidden />
      <span className="ec-hero-edge ec-hero-edge-l">Atelier — MMXXVI</span>
      <span className="ec-hero-edge ec-hero-edge-r">925 · Solid Sterling</span>
      <div className="ec-hero-grid">
        <div className="ec-hero-copy">
          <h1 className="ec-hero-title">
            <span className="ec-reveal" style={{ animationDelay: ".05s" }}>Jewelry</span>
            <span className="ec-reveal" style={{ animationDelay: ".18s" }}>that <em>catches</em></span>
            <span className="ec-reveal" style={{ animationDelay: ".31s" }}>the light</span>
          </h1>
        </div>
        <div className="ec-hero-feature ec-reveal" style={{ animationDelay: ".42s" }}>
          <div className="ec-hero-feature-frame">
            <Tile
              id={featured ? featured.key : "eclaire"}
              swatch={featured ? featured.swatch : "#C8CCD2"}
              image={featured ? getPrimaryImage(featured) : null}
              name={featured ? featured.name : "Éclaire"}
              hover
            />
          </div>
          {featured && (
            <button className="ec-hero-feature-cap" onClick={onShop}>
              <span className="ec-hero-feature-name">{featured.name}</span>
              <span className="ec-hero-feature-price">{formatPrice(featured.price, featured.currency)}</span>
            </button>
          )}
        </div>
      </div>
      <div className="ec-hero-foot ec-reveal" style={{ animationDelay: ".5s" }}>
        <p className="ec-hero-note">Solid 925 sterling silver — hand-finished in the atelier, weighted to last.</p>
        <button className="ec-link-cta ec-link-cta-lg" onClick={onShop}>
          <span className="ec-link-cta-row">Discover the collection <Icon.Arrow width="18" height="18" /></span>
          <span className="ec-link-cta-line" />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ MANIFESTO --------------------------------- */
function Manifesto() {
  return (
    <section className="ec-manifesto" id="manifesto">
      <span className="ec-kicker">The Promise</span>
      <p className="ec-manifesto-text">
        Solid <em>925</em> sterling silver. Not plated, not hollow — each piece is
        hand-finished to hold the light and feel like an <em>heirloom</em> from the very
        first wear.
      </p>
    </section>
  );
}

/* ------------------------------ PRODUCT CARD ------------------------------ */
function ProductCard({ group, onOpen, onAdd, index }) {
  const [hover, setHover] = useState(false);
  return (
    <article
      className="ec-card ec-reveal-up"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button className="ec-card-media" onClick={() => onOpen(group)} aria-label={`View ${group.name}`}>
        <span className="ec-card-index">{String(index + 1).padStart(2, "0")}</span>
        {group.tag && <span className={`ec-tag ec-tag-${String(group.tag).toLowerCase()}`}>{group.tag}</span>}
        <Tile id={group.key} swatch={group.swatch} image={getPrimaryImage(group)} name={group.name} hover={hover} />
      </button>
      <div className="ec-card-body">
        <div className="ec-card-row">
          <h3 className="ec-card-name">{group.name}</h3>
          <span className="ec-card-price">{formatPrice(group.price, group.currency)}</span>
        </div>
        <p className="ec-card-meta">{group.metal}{group.metal && group.defaultLength ? " — " : ""}{group.defaultLength}</p>
        <button className="ec-card-add" onClick={() => onAdd(group, group.defaultLength, group.defaultWidth)}>
          <span className="ec-link-cta-row">Add to bag <Icon.Arrow width="14" height="14" /></span>
          <span className="ec-link-cta-line" />
        </button>
      </div>
    </article>
  );
}

/* ------------------------------ SHOP GRID --------------------------------- */
function Shop({ groups, onOpen, onAdd, collections, filter, setFilter, sort, setSort }) {
  return (
    <section className="ec-shop" id="shop">
      <div className="ec-shop-head">
        <div className="ec-shop-head-l">
          <span className="ec-kicker">The Collection — {String(groups.length).padStart(2, "0")}</span>
          <h2 className="ec-section-title">Signature<br /><em>Silver</em></h2>
        </div>
        <div className="ec-shop-controls">
          <div className="ec-chips">
            {collections.map((c) => (
              <button key={c} className={`ec-chip ${filter === c ? "is-on" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="ec-select-wrap">
            <select className="ec-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price · Low to High</option>
              <option value="high">Price · High to Low</option>
            </select>
          </div>
        </div>
      </div>
      <div className="ec-grid">
        {groups.map((g, i) => (
          <ProductCard key={g.key} group={g} index={i} onOpen={onOpen} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ VALUES BAND ------------------------------- */
function Values() {
  const items = [
    { t: "Made With Intention", d: "Every piece is hand-finished and considered — never mass-produced, never rushed." },
    { t: "Chosen for Brilliance", d: "Materials selected for natural light, weight, and a durability built to last." },
    { t: "Beyond the Season", d: "Designed to be worn and loved for years — never tied to a passing trend." },
  ];
  return (
    <section className="ec-values">
      <div className="ec-values-grid">
        {items.map((it, i) => (
          <div className="ec-value ec-reveal-up" key={i}>
            <span className="ec-value-num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{it.t}</h3>
            <p>{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- STORY ----------------------------------- */
function Story() {
  return (
    <section className="ec-story" id="story">
      <div className="ec-story-inner">
        <div className="ec-story-visual" aria-hidden>
          <div className="ec-story-orb" />
        </div>
        <div className="ec-story-text">
          <span className="ec-kicker">The Atelier</span>
          <h2 className="ec-section-title">Born to celebrate light<br/>in its <em>most beautiful</em> forms.</h2>
          <p>
            We begin with solid 925 sterling silver of exceptional quality and weight,
            crafted so it sparkles with genuine brilliance and feels like an heirloom from
            the very first wear.
          </p>
          <p>
            Éclaire is not defined by one metal. Over time we’ll introduce collections in
            gold and beyond — but we’ll always be defined by the way our jewelry makes you
            feel when you wear it.
          </p>
          <p className="ec-signature">— The Éclaire Atelier</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- PRODUCT DRAWER ------------------------------ */
function ProductModal({ group, onClose, onAdd }) {
  const [len, setLen] = useState(group?.defaultLength);
  const [width, setWidth] = useState(group?.defaultWidth);
  useEffect(() => { setLen(group?.defaultLength); setWidth(group?.defaultWidth); }, [group]);
  if (!group) return null;

  // Resolve the chosen combination against the catalog (Pattern B may mark
  // specific combinations sold out; Pattern A is always the one product).
  const resolved = group.resolve(len, width);
  const price = resolved && resolved.price != null ? resolved.price : group.price;
  const unavailable = !resolved || resolved.available === false;
  const badge = resolved && typeof resolved.stock === "number" ? stockBadge(resolved.stock) : null;

  return (
    <div className="ec-overlay" onClick={onClose}>
      <div className="ec-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ec-modal-close" onClick={onClose} aria-label="Close"><Icon.Close width="22" height="22" /></button>
        <div className="ec-modal-media">
          <Tile id={group.key} swatch={group.swatch} image={getPrimaryImage(group)} name={group.name} hover />
        </div>
        <div className="ec-modal-info">
          <p className="ec-eyebrow">{group.collection}{group.tag ? ` · ${group.tag}` : ""}</p>
          <h2 className="ec-modal-name">{group.name}</h2>
          <p className="ec-modal-price">{formatPrice(price, group.currency)}</p>
          <p className="ec-modal-desc">{group.desc}</p>
          <dl className="ec-specs">
            {group.metal && <div><dt>Material</dt><dd>{group.metal}</dd></div>}
            {group.weight && <div><dt>Weight</dt><dd>{group.weight}</dd></div>}
          </dl>
          <div className="ec-len">
            <span className="ec-len-label">Length</span>
            <div className="ec-len-opts">
              {group.lengths.map((l) => {
                const r = group.resolve(l, width);
                const off = r && r.available === false;
                return (
                  <button key={l} disabled={off} className={`ec-len-opt ${len === l ? "is-on" : ""}`} onClick={() => setLen(l)}>{l}</button>
                );
              })}
            </div>
          </div>
          <div className="ec-len">
            <span className="ec-len-label">Width</span>
            <div className="ec-len-opts">
              {group.widths.map((w) => {
                const r = group.resolve(len, w);
                const off = r && r.available === false;
                return (
                  <button key={w} disabled={off} className={`ec-len-opt ${width === w ? "is-on" : ""}`} onClick={() => setWidth(w)}>{w}</button>
                );
              })}
            </div>
          </div>
          {badge && <p className={`ec-stock ${resolved.stock === 0 ? "is-out" : "is-low"}`}>{badge}</p>}
          <button
            className="ec-btn ec-btn-dark ec-full"
            disabled={unavailable}
            onClick={() => { onAdd(group, len, width); onClose(); }}
          >
            {unavailable ? "Unavailable" : `Add to bag · ${formatPrice(price, group.currency)}`}
          </button>
          <p className="ec-modal-note">Ships in recyclable Éclaire packaging · 30-day returns</p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- CART ------------------------------------ */
function Cart({ open, items, quote, quoteLoading, quoteError, code, setCode, onApply, onClose, onQty, onRemove, onCheckout, demo, checkoutError, checkoutBusy }) {
  const currency = items[0]?.currency || "usd";
  const clientSubtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Authoritative amounts come from /discounts/validate when available.
  const original = quote ? quote.original_amount : clientSubtotal;
  const discountAmount = quote ? quote.discount_amount : 0;
  const total = quote ? quote.final_amount : clientSubtotal;
  const freeShip = quote ? quote.is_free_shipping : false;
  const autoSales = (quote && quote.automatic_discounts) || [];
  const appliedLabel = quote && quote.valid && quote.discount ? (quote.discount.description || quote.discount.name || quote.discount.code) : null;

  return (
    <>
      <div className={`ec-scrim ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`ec-cart ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="ec-cart-head">
          <h2>Your Bag</h2>
          <button className="ec-icon-btn" onClick={onClose} aria-label="Close cart"><Icon.Close width="22" height="22" /></button>
        </div>
        {items.length === 0 ? (
          <div className="ec-cart-empty">
            <Icon.Spark width="40" height="40" />
            <p>Your bag is waiting to catch the light.</p>
          </div>
        ) : (
          <>
            <div className="ec-cart-items">
              {autoSales.length > 0 && (
                <div className="ec-sale-banner"><Icon.Spark width="13" height="13" /> {autoSales[0].description || autoSales[0].name}</div>
              )}
              {items.map((it) => (
                <div className="ec-cart-item" key={it.key}>
                  <div className="ec-cart-thumb"><Tile id={it.groupKey} swatch={it.swatch} image={it.image} name={it.name} /></div>
                  <div className="ec-cart-detail">
                    <div className="ec-cart-toprow">
                      <h4>{it.name}</h4>
                      <button className="ec-cart-remove" onClick={() => onRemove(it.key)} aria-label="Remove"><Icon.Close width="15" height="15" /></button>
                    </div>
                    <p className="ec-cart-sub">{it.length} · {it.width}{it.metal ? ` · ${it.metal}` : ""}</p>
                    <div className="ec-cart-bottomrow">
                      <div className="ec-qty">
                        <button onClick={() => onQty(it.key, -1)} aria-label="Decrease"><Icon.Minus width="15" height="15" /></button>
                        <span>{it.qty}</span>
                        <button onClick={() => onQty(it.key, 1)} aria-label="Increase"><Icon.Plus width="15" height="15" /></button>
                      </div>
                      <span className="ec-cart-price">{formatPrice(it.price * it.qty, it.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ec-cart-foot">
              {!demo && (
                <div className="ec-discount">
                  <div className="ec-discount-row">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Discount code"
                      onKeyDown={(e) => e.key === "Enter" && onApply()}
                    />
                    <button className="ec-discount-apply" onClick={onApply} disabled={quoteLoading || !code.trim()}>
                      {quoteLoading ? "…" : "Apply"}
                    </button>
                  </div>
                  {quoteError && <p className="ec-discount-msg is-err">{quoteError}</p>}
                  {appliedLabel && <p className="ec-discount-msg is-ok"><Icon.Check width="13" height="13" /> {appliedLabel}</p>}
                </div>
              )}

              <div className="ec-cart-lines">
                <div className="ec-cart-line"><span>Subtotal</span><span>{formatPrice(original, currency)}</span></div>
                {discountAmount > 0 && (
                  <div className="ec-cart-line is-discount"><span>Discount</span><span>−{formatPrice(discountAmount, currency)}</span></div>
                )}
                <div className="ec-cart-line"><span>Shipping</span><span>{freeShip ? "FREE" : "Calculated at checkout"}</span></div>
              </div>

              <div className="ec-cart-subtotal">
                <span>Total</span><span>{formatPrice(total, currency)}</span>
              </div>

              {checkoutError && <p className="ec-discount-msg is-err">{checkoutError}</p>}
              {demo ? (
                <>
                  <button className="ec-btn ec-btn-dark ec-full" disabled>Checkout unavailable in demo</button>
                  <p className="ec-cart-ship">Set <code>VITE_API_BASE</code> to enable live checkout.</p>
                </>
              ) : (
                <button className="ec-btn ec-btn-dark ec-full" onClick={onCheckout} disabled={checkoutBusy}>
                  {checkoutBusy ? "Redirecting…" : "Checkout"}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ------------------------------- SEARCH ----------------------------------- */
function SearchOverlay({ open, groups, onClose, onOpenProduct }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open && ref.current) ref.current.focus(); if (!open) setQ(""); }, [open]);
  // No /search endpoint exists — filter the loaded catalog client-side.
  const results = q.trim()
    ? groups.filter((g) => (g.name + " " + g.collection + " " + g.metal).toLowerCase().includes(q.toLowerCase()))
    : [];
  if (!open) return null;
  return (
    <div className="ec-search-overlay" onClick={onClose}>
      <div className="ec-search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ec-search-bar">
          <Icon.Search width="22" height="22" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the collection…" />
          <button className="ec-icon-btn" onClick={onClose} aria-label="Close search"><Icon.Close width="22" height="22" /></button>
        </div>
        {q.trim() && (
          <div className="ec-search-results">
            {results.length === 0 && <p className="ec-search-empty">No pieces found for “{q}”.</p>}
            {results.map((g) => (
              <button key={g.key} className="ec-search-result" onClick={() => { onOpenProduct(g); onClose(); }}>
                <span className="ec-search-thumb"><Tile id={g.key} swatch={g.swatch} image={getPrimaryImage(g)} name={g.name} /></span>
                <span className="ec-search-name">{g.name}<em>{g.collection}</em></span>
                <span className="ec-search-price">{formatPrice(g.price, g.currency)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- NEWSLETTER ------------------------------- */
function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="ec-news">
      <div className="ec-news-inner">
        <span className="ec-kicker ec-kicker-light">Keep in touch</span>
        <h2>Be first<br/>to the <em>light.</em></h2>
        {done ? (
          <p className="ec-news-done">Welcome to Éclaire — keep an eye on your inbox.</p>
        ) : (
          <div className="ec-news-form">
            {/* BACKEND: POST email to your list provider (no API endpoint documented) */}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" type="email" />
            <button className="ec-news-submit" onClick={() => email.includes("@") && setDone(true)} aria-label="Subscribe">
              <Icon.Arrow width="20" height="20" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------- FOOTER ---------------------------------- */
function Footer({ onNav }) {
  return (
    <footer className="ec-footer">
      <button className="ec-footer-word" onClick={() => onNav("top")} aria-label="Éclaire home">Éclaire</button>
      <div className="ec-footer-top">
        <p className="ec-footer-blurb">Brilliance, beautifully made.<br/>Solid 925 sterling silver, crafted to be worn for years.</p>
        <div className="ec-footer-cols">
          <div><h4>Shop</h4><button onClick={() => onNav("shop")}>Signature Silver</button><button onClick={() => onNav("shop")}>Bestsellers</button><button onClick={() => onNav("shop")}>New Arrivals</button></div>
          <div><h4>Atelier</h4><button onClick={() => onNav("story")}>Our Story</button><button>Materials</button><button>Craftsmanship</button></div>
          <div><h4>Care</h4><button>Shipping</button><button>Returns</button><button>Jewelry Care</button></div>
        </div>
      </div>
      <div className="ec-footer-bottom">
        <span>© {new Date().getFullYear()} Éclaire</span>
        <span className="ec-footer-tag">Light. Crafted.</span>
      </div>
    </footer>
  );
}

/* ---------------------------- ORDER STATUS -------------------------------- */
const STATUS_COPY = {
  pending: "Processing…",
  paid: "Order confirmed!",
  fulfilled: "Order shipped!",
  cancelled: "Order cancelled",
};
const FULFILLMENT_COPY = {
  unfulfilled: "Preparing your order",
  processing: "Your order is being packed",
  shipped: "Your order is on the way!",
  delivered: "Your order has been delivered",
};

function OrderStatus({ sessionId, onBack }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Length/width selections aren't stored on the order line items in Pattern A,
  // so recover them from the snapshot saved just before redirect.
  const snapshot = useRef(null);
  if (snapshot.current === null) {
    try { snapshot.current = JSON.parse(localStorage.getItem("eclaire:lastCart") || "null"); }
    catch { snapshot.current = null; }
  }

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
    <div className="ec-order">
      <div className="ec-order-inner">
        <button className="ec-logo ec-order-logo" onClick={onBack}>
          <span className="ec-logo-mark"><Icon.Spark width="14" height="14" /></span>Éclaire
        </button>

        {loading && (
          <div className="ec-order-card ec-order-loading">
            <Icon.Spark width="34" height="34" className="ec-news-spark" />
            <h2>Confirming your order…</h2>
            <p>Hold tight while we finalise your payment.</p>
          </div>
        )}

        {error && !loading && (
          <div className="ec-order-card">
            <h2>We couldn’t load your order</h2>
            <p>{error}</p>
            <button className="ec-btn ec-btn-dark" onClick={onBack}>Back to shop</button>
          </div>
        )}

        {order && (
          <div className="ec-order-card">
            <span className="ec-order-icon"><Icon.Check width="30" height="30" /></span>
            <h2>{STATUS_COPY[order.status] || "Order received"}</h2>
            <p className="ec-order-state">{FULFILLMENT_COPY[order.fulfillment_status] || ""}</p>
            {order.customer_email && <p className="ec-order-email">A confirmation was sent to {order.customer_email}.</p>}

            <div className="ec-order-items">
              {(order.items || []).map((it) => (
                <div className="ec-order-row" key={it.id}>
                  <span>{it.product_name} × {it.quantity}</span>
                  <span>{formatPrice(it.price * it.quantity, it.currency)}</span>
                </div>
              ))}
              <div className="ec-order-row ec-order-total">
                <span>Total</span><span>{formatPrice(order.amount_total, order.currency)}</span>
              </div>
            </div>

            {snapshot.current && snapshot.current.length > 0 && (
              <div className="ec-order-selections">
                <h3>Your selections</h3>
                {snapshot.current.map((l) => (
                  <p key={l.key}>{l.name} — {l.length} / {l.width} × {l.qty}</p>
                ))}
              </div>
            )}

            {order.tracking_number && (
              <div className="ec-order-tracking">
                <span className="ec-order-icon sm"><Icon.Truck width="20" height="20" /></span>
                <div>
                  <p className="ec-order-track-label">{order.shipping_carrier || "Tracking"}{order.shipping_service ? ` · ${order.shipping_service}` : ""}</p>
                  <a href={trackingUrl(order.shipping_carrier, order.tracking_number)} target="_blank" rel="noreferrer">
                    {order.tracking_number}
                  </a>
                </div>
              </div>
            )}

            {order.shipping_address_line1 && (
              <div className="ec-order-ship">
                <h3>Shipping to</h3>
                <p>
                  {order.shipping_name}<br />
                  {order.shipping_address_line1}{order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}<br />
                  {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ""} {order.shipping_postal_code}<br />
                  {order.shipping_country}
                </p>
              </div>
            )}

            <button className="ec-btn ec-btn-dark ec-full" onClick={onBack}>Continue shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================== APP =================================== */
export default function App() {
  const [groups, setGroups] = useState([]);
  const [collections, setCollections] = useState(["All"]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [demo, setDemo] = useState(!API_CONFIGURED);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("featured");
  const [scrolled, setScrolled] = useState(false);

  // discount quote
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const quoteReq = useRef(0);

  // checkout
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // success / order-status route
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("session_id");
  });

  /* Load catalog */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let products;
        if (API_CONFIGURED) {
          products = await api.listAllProducts();
        } else {
          products = MOCK_PRODUCTS;
        }
        const built = buildCatalog(products);
        if (!alive) return;
        setGroups(built);
        setCollections(["All", ...Array.from(new Set(built.map((g) => g.collection).filter(Boolean)))]);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        // Fall back to demo data so the storefront still renders.
        const built = buildCatalog(MOCK_PRODUCTS);
        setGroups(built);
        setCollections(["All", ...Array.from(new Set(built.map((g) => g.collection).filter(Boolean)))]);
        setDemo(true);
        setLoadError(e.message);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll-reveal observer (re-bind when the grid changes)
  useEffect(() => {
    const els = document.querySelectorAll(".ec-reveal-up");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [groups]);

  const addToCart = useCallback((group, length, width) => {
    const resolved = group.resolve(length, width);
    if (!resolved || resolved.available === false) return;
    const productId = resolved.productId;
    const price = resolved.price != null ? resolved.price : group.price;
    const key = `${productId}|${length}|${width}`;
    setCart((c) => {
      const existing = c.find((i) => i.key === key);
      if (existing) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...c, {
        key, productId, groupKey: group.key, name: group.name, length, width,
        price, currency: group.currency, qty: 1, swatch: group.swatch,
        image: getPrimaryImage(group), metal: group.metal,
      }];
    });
    // Cart changed — any applied discount is now stale.
    setQuote(null); setQuoteError(null);
    setCartOpen(true);
  }, []);

  const changeQty = (key, d) => {
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
    setQuote(null); setQuoteError(null);
  };
  const removeItem = (key) => {
    setCart((c) => c.filter((i) => i.key !== key));
    setQuote(null); setQuoteError(null);
  };

  /* Validate a discount code / refresh the quote against the current cart. */
  const refreshQuote = useCallback(async (withCode) => {
    if (demo || cart.length === 0) return;
    const items = aggregateItems(cart, true);
    const reqId = ++quoteReq.current;
    setQuoteLoading(true); setQuoteError(null);
    try {
      const data = await api.validateDiscount(withCode, items);
      if (reqId !== quoteReq.current) return; // a newer request superseded this
      if (withCode && data.valid === false) setQuoteError(data.error || "That code can’t be applied.");
      setQuote(data);
    } catch (e) {
      if (reqId !== quoteReq.current) return;
      setQuoteError(e.message);
    } finally {
      if (reqId === quoteReq.current) setQuoteLoading(false);
    }
  }, [cart, demo]);

  // Surface automatic sales (no code) when the cart opens with items.
  useEffect(() => {
    if (cartOpen && !demo && cart.length > 0 && !quote) refreshQuote(code.trim() || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  const checkout = useCallback(async () => {
    if (demo || cart.length === 0) return;
    setCheckoutBusy(true); setCheckoutError(null);
    try {
      const items = aggregateItems(cart, false);
      const base = window.location.origin + window.location.pathname;
      // Saved so the success page can show the chosen length/width (Pattern A).
      localStorage.setItem("eclaire:lastCart", JSON.stringify(cart));
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

  const nav = (where) => {
    setCartOpen(false); setSearchOpen(false);
    if (where === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(where)?.scrollIntoView({ behavior: "smooth" });
  };

  const leaveOrderView = () => {
    window.history.replaceState({}, "", window.location.origin + window.location.pathname);
    setSessionId(null);
  };

  // Order-status / success route takes over the whole screen.
  if (sessionId) {
    return (
      <div className="ec-root">
        <Styles />
        <OrderStatus sessionId={sessionId} onBack={leaveOrderView} />
      </div>
    );
  }

  let shown = filter === "All" ? groups : groups.filter((g) => g.collection === filter);
  if (sort === "low") shown = [...shown].sort((a, b) => a.price - b.price);
  if (sort === "high") shown = [...shown].sort((a, b) => b.price - a.price);

  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="ec-root">
      <Styles />
      {demo && (
        <div className="ec-demo-banner">
          Demo mode — showing sample products. {loadError ? `(API error: ${loadError}) ` : ""}Set <code>VITE_API_BASE</code> to connect the live store.
        </div>
      )}
      <Header count={count} scrolled={scrolled}
        onCart={() => setCartOpen(true)} onSearch={() => setSearchOpen(true)} onNav={nav} />
      <main>
        <Hero onShop={() => nav("shop")} featured={groups[0] || null} />
        <Manifesto />
        {loading ? (
          <section className="ec-shop" id="shop"><p className="ec-loading">Loading the collection…</p></section>
        ) : (
          <Shop groups={shown} onOpen={setActive} onAdd={addToCart}
            collections={collections} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />
        )}
        <Values />
        <Story />
        <Newsletter />
      </main>
      <Footer onNav={nav} />
      <ProductModal group={active} onClose={() => setActive(null)} onAdd={addToCart} />
      <Cart
        open={cartOpen} items={cart} quote={quote} quoteLoading={quoteLoading} quoteError={quoteError}
        code={code} setCode={setCode} onApply={() => refreshQuote(code.trim() || undefined)}
        onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeItem}
        onCheckout={checkout} demo={demo} checkoutError={checkoutError} checkoutBusy={checkoutBusy}
      />
      <SearchOverlay open={searchOpen} groups={groups} onClose={() => setSearchOpen(false)} onOpenProduct={setActive} />
    </div>
  );
}

/* ================================ STYLES ================================== */
function Styles() {
  return (
    <style>{`
/* Fonts (Playfair Display + Inter) are loaded via <link> in index.html. */

:root{
  /* Backgrounds — warm ivory for heirloom softness + breathing room */
  --cream:#FAF7F2;        /* bg-primary — main site background */
  --cream-2:#F0EBE3;      /* bg-secondary — cards, soft sections */
  --bg-elevated:#FFFFFF;  /* pure white — modals, elevated cards */
  --bg-dark:#111111;      /* near-black — dramatic sections / footer text band */
  /* Text */
  --ink:#1C1C1C;          /* text-primary — body & headlines */
  --ink-soft:#5A5A5A;     /* text-secondary — descriptions, meta */
  --text-inverse:#FAF7F2; /* light text on dark */
  /* Silver & accents */
  --silver:#C9C9C9;       /* primary silver tone */
  --silver-dark:#9A9A9A;  /* darker silver — hover/active */
  --platinum:#E8E8E8;     /* brighter silver highlight */
  --champagne:#E2D2AE;    /* soft champagne — warm accents on dark */
  --gold:#C9A962;         /* gold-accent — light/sparkle motif, used sparingly */
  --navy:#111111;         /* dark CTA hover */
  /* Functional */
  --line:#E5E0D8;         /* soft warm border */
  --line-strong:#D1CBBF;  /* stronger border / focus */
  --success:#2E5A3C;      /* deep forest green */
  --error:#8B3A3A;        /* muted burgundy */
  --serif:'Playfair Display',Georgia,serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
.ec-root{background:var(--cream);color:var(--ink);font-family:var(--sans);font-weight:400;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
button:disabled{cursor:not-allowed}
input,select{font-family:inherit}
img{display:block;max-width:100%}
:focus-visible{outline:2px solid var(--silver-dark);outline-offset:2px;border-radius:2px}

/* reveal */
@keyframes ecRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.ec-reveal{opacity:0;animation:ecRise .9s cubic-bezier(.2,.7,.2,1) forwards}
.ec-reveal-up{opacity:0;transform:translateY(30px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.ec-reveal-up.is-in{opacity:1;transform:none}

.ec-eyebrow{display:inline-flex;align-items:center;gap:.6em;font-size:.7rem;letter-spacing:.32em;text-transform:uppercase;color:var(--ink-soft);font-weight:500}
.ec-eyebrow svg{color:var(--gold)}
.ec-section-title{font-family:var(--sans);font-weight:300;font-size:clamp(2.1rem,4.6vw,3.5rem);line-height:1.12;letter-spacing:-.012em;margin-top:.7rem}
.ec-italic{font-family:var(--serif);font-style:italic;font-weight:500}

.ec-btn{display:inline-flex;align-items:center;gap:.6em;padding:1rem 1.9rem;border-radius:4px;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;transition:.3s}
.ec-btn-dark{background:var(--ink);color:var(--cream)}
.ec-btn-dark:hover{background:var(--navy);transform:translateY(-2px);box-shadow:0 14px 30px -12px rgba(26,28,34,.5)}
.ec-btn-dark:disabled{background:#9a9ca3;transform:none;box-shadow:none;opacity:.8}
.ec-btn-dark svg{transition:transform .3s}
.ec-btn-dark:hover:not(:disabled) svg{transform:translateX(4px)}
.ec-full{width:100%;justify-content:center}
/* Understated underlined-arrow link CTA */
.ec-link-cta{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.75rem;color:inherit;transition:.3s}
.ec-link-cta-row{display:inline-flex;align-items:center;gap:1.1rem;font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;font-weight:500}
.ec-link-cta-line{display:block;height:1px;width:150px;background:currentColor;opacity:.45;transition:.35s cubic-bezier(.2,.7,.2,1)}
.ec-link-cta:hover .ec-link-cta-line{width:200px;opacity:.95}
.ec-link-cta svg{transition:transform .3s}
.ec-link-cta:hover svg{transform:translateX(7px)}
.ec-link-cta-lg .ec-link-cta-row{font-size:.85rem}
.ec-link-cta-lg .ec-link-cta-line{width:210px}
.ec-link-cta-lg:hover .ec-link-cta-line{width:270px}

/* DEMO BANNER */
.ec-demo-banner{position:relative;z-index:70;background:var(--ink);color:var(--cream);text-align:center;font-size:.76rem;letter-spacing:.04em;padding:.55rem 1rem}
.ec-demo-banner code{font-family:ui-monospace,monospace;color:var(--champagne)}
.ec-loading{text-align:center;color:var(--ink-soft);padding:4rem 0;font-family:var(--serif);font-style:italic;font-size:1.2rem}

/* HEADER */
.ec-header{position:fixed;top:0;left:0;right:0;z-index:60;display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;gap:1rem;padding:1.6rem clamp(1rem,4vw,3.5rem);transition:.4s;color:var(--text-inverse)}
.ec-header.is-scrolled{background:rgba(250,247,242,.9);backdrop-filter:blur(14px);padding-top:1rem;padding-bottom:1rem;box-shadow:0 1px 0 var(--line);color:var(--ink)}
.ec-nav-link{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:inherit;opacity:.82;transition:.25s;justify-self:start}
.ec-header .ec-nav-link:nth-of-type(2){justify-self:start}
.ec-nav-link:hover{opacity:1}
.ec-logo{grid-column:3;display:inline-flex;align-items:center;gap:.45em;font-family:var(--serif);font-size:1.7rem;font-weight:500;letter-spacing:.02em;color:inherit}
.ec-logo-mark{color:var(--gold);display:inline-flex;animation:ecTwinkle 4s ease-in-out infinite}
@keyframes ecTwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82) rotate(8deg)}}
.ec-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;color:inherit;transition:.25s}
.ec-icon-btn:hover{background:rgba(127,127,127,.16)}
.ec-header .ec-icon-btn:nth-of-type(1){justify-self:end}
.ec-bag{grid-column:5;justify-self:end;position:relative}
.ec-bag-count{position:absolute;top:2px;right:2px;background:var(--ink);color:var(--text-inverse);font-size:.6rem;font-weight:500;min-width:17px;height:17px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px}

/* HERO */
.ec-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:7rem 1.5rem 5rem;overflow:hidden;background:var(--bg-dark);color:var(--text-inverse)}
.ec-hero-rays{position:absolute;inset:0;background:
  radial-gradient(ellipse 78% 55% at 50% 20%, rgba(232,232,232,.16), transparent 62%),
  radial-gradient(ellipse 90% 80% at 50% 122%, rgba(201,169,98,.13), transparent 58%),
  linear-gradient(180deg,#171717 0%,#0e0e0e 62%,#0b0b0b 100%)}
.ec-hero .ec-eyebrow{color:rgba(250,247,242,.72)}
.ec-hero .ec-link-cta{align-items:center}
.ec-hero-grain{position:absolute;inset:0;opacity:.28;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")}
.ec-hero-inner{position:relative;max-width:760px;z-index:2}
.ec-hero-title{font-family:var(--sans);font-weight:300;font-size:clamp(2.8rem,8vw,5.6rem);line-height:1.08;letter-spacing:-.01em;margin:1.7rem 0}
.ec-hero-title span{display:block}
.ec-hero-sub{max-width:500px;margin:0 auto 2.8rem;font-size:1.04rem;line-height:1.75;color:rgba(250,247,242,.62)}
.ec-hero-scroll{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.6rem;font-size:.62rem;letter-spacing:.34em;text-transform:uppercase;color:rgba(250,247,242,.55)}
.ec-hero-scroll i{width:1px;height:42px;background:linear-gradient(rgba(250,247,242,.6),transparent);animation:ecDrop 2s ease-in-out infinite}
@keyframes ecDrop{0%,100%{transform:scaleY(.4);transform-origin:top;opacity:.4}50%{transform:scaleY(1);opacity:1}}

/* MARQUEE */
.ec-marquee{background:var(--ink);color:var(--cream);padding:1.1rem 0;overflow:hidden;white-space:nowrap}
.ec-marquee-track{display:inline-flex;gap:3rem;animation:ecScroll 32s linear infinite}
.ec-marquee-item{display:inline-flex;align-items:center;gap:1.4rem;font-family:var(--sans);font-weight:400;font-size:.82rem;letter-spacing:.28em;text-transform:uppercase}
.ec-marquee-spark{color:var(--champagne)}
@keyframes ecScroll{to{transform:translateX(-50%)}}

/* SHOP */
.ec-shop{max-width:1280px;margin:0 auto;padding:clamp(4rem,9vw,7rem) clamp(1rem,4vw,3.5rem)}
.ec-shop-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1.5rem;margin-bottom:2.8rem}
.ec-shop-controls{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.ec-chips{display:flex;gap:.5rem}
.ec-chip{padding:.55rem 1.1rem;border-radius:4px;border:1px solid var(--line-strong);font-size:.78rem;letter-spacing:.06em;color:var(--ink-soft);transition:.25s}
.ec-chip:hover{border-color:var(--ink);color:var(--ink)}
.ec-chip.is-on{background:var(--ink);color:var(--text-inverse);border-color:var(--ink)}
.ec-select-wrap{position:relative}
.ec-select{appearance:none;padding:.6rem 2.2rem .6rem 1rem;border-radius:4px;border:1px solid var(--line-strong);background:transparent;font-size:.78rem;color:var(--ink);cursor:pointer}
.ec-select-wrap::after{content:"";position:absolute;right:1rem;top:50%;width:7px;height:7px;border-right:1.5px solid var(--ink-soft);border-bottom:1.5px solid var(--ink-soft);transform:translateY(-65%) rotate(45deg);pointer-events:none}
.ec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:clamp(1.2rem,3vw,2.4rem)}

/* CARD */
.ec-card{display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ec-card:hover{transform:translateY(-4px)}
.ec-card-media{position:relative;border-radius:6px;overflow:hidden;aspect-ratio:4/5;background:linear-gradient(160deg,#ffffff,var(--cream-2));display:block;width:100%;transition:box-shadow .3s ease}
.ec-card:hover .ec-card-media{box-shadow:0 18px 44px -22px rgba(28,28,28,.4)}
.ec-tag{position:absolute;top:14px;left:14px;z-index:3;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;padding:.4rem .7rem;border-radius:999px;background:rgba(250,247,242,.85);backdrop-filter:blur(6px);color:var(--ink);font-weight:400}
.ec-tag-new{background:var(--ink);color:var(--champagne)}
.ec-tag-bestseller{background:var(--ink);color:var(--text-inverse)}
.ec-card-body{padding:1.1rem .1rem 0}
.ec-card-row{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}
.ec-card-name{font-family:var(--sans);font-weight:600;font-size:1.05rem;letter-spacing:-.005em}
.ec-card-price{font-size:1rem;font-weight:600;color:var(--ink)}
.ec-card-meta{font-size:.8rem;color:var(--ink-soft);margin-top:.3rem;letter-spacing:.01em}
.ec-card-add{margin-top:1rem;display:inline-flex;align-items:center;gap:.55rem;padding:0;border:none;background:none;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;font-weight:500;color:var(--ink);transition:.25s}
.ec-card-add svg{transition:transform .3s}
.ec-card-add:hover{opacity:.55}
.ec-card-add:hover svg{transform:translateX(5px)}

/* PRODUCT VISUAL */
.ec-visual{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ec-visual-glow{position:absolute;width:75%;height:60%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,255,255,0) 70%);filter:blur(6px)}
.ec-visual-svg{position:relative;height:86%;width:auto;z-index:2;filter:drop-shadow(0 6px 16px rgba(60,64,73,.28))}
.ec-visual-img{position:relative;z-index:2;width:100%;height:100%;object-fit:cover}
.ec-visual-sheen{position:absolute;top:0;left:-60%;width:50%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.7),transparent);transform:skewX(-18deg);transition:left .7s ease;z-index:3;pointer-events:none}
.ec-card-media:hover .ec-visual-sheen{left:120%}

/* VALUES */
.ec-values{max-width:1280px;margin:0 auto;padding:0 clamp(1rem,4vw,3.5rem) clamp(3rem,7vw,6rem)}
.ec-values-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:2rem;border-top:1px solid var(--line);padding-top:clamp(2.5rem,5vw,4rem)}
.ec-value{text-align:center;padding:0 1rem}
.ec-value-icon{display:inline-flex;align-items:center;justify-content:center;color:var(--ink);margin-bottom:1.3rem}
.ec-value h3{font-family:var(--serif);font-weight:600;font-size:1.3rem;margin-bottom:.5rem}
.ec-value p{font-size:.92rem;line-height:1.65;color:var(--ink-soft);max-width:280px;margin:0 auto}

/* STORY */
.ec-story{background:var(--bg-dark);color:var(--text-inverse);padding:clamp(4rem,9vw,8rem) clamp(1rem,4vw,3.5rem)}
.ec-story .ec-eyebrow{color:rgba(250,247,242,.72)}
.ec-story-inner{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(2rem,6vw,5rem);max-width:1280px;margin:0 auto}
.ec-story-visual{position:relative;aspect-ratio:1;border-radius:8px;background:radial-gradient(circle at 40% 35%,#fff,#e9e3d6 70%,#d8d1c2);overflow:hidden;display:flex;align-items:center;justify-content:center}
.ec-story-orb{width:55%;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 0deg,var(--silver),#fff,var(--champagne),var(--gold),var(--silver));filter:blur(2px);animation:ecSpin 18s linear infinite;box-shadow:inset 0 0 60px rgba(255,255,255,.6),0 20px 50px -20px rgba(60,64,73,.5)}
@keyframes ecSpin{to{transform:rotate(360deg)}}
.ec-story-spark{position:absolute;color:#fff;filter:drop-shadow(0 0 10px rgba(255,255,255,.9))}
.ec-story-spark.s1{top:18%;right:20%;animation:ecTwinkle 3.5s ease-in-out infinite}
.ec-story-spark.s2{bottom:24%;left:18%;animation:ecTwinkle 4.5s ease-in-out infinite .5s}
.ec-story-spark.s3{top:30%;left:26%;animation:ecTwinkle 5s ease-in-out infinite 1s}
.ec-story-text p{margin-top:1.1rem;font-size:1rem;line-height:1.78;color:rgba(250,247,242,.68);max-width:46ch}
.ec-story-text .ec-section-title{margin-bottom:.4rem}
.ec-signature{font-family:var(--serif);font-style:italic;color:var(--text-inverse) !important;margin-top:1.5rem !important}

/* OVERLAYS / MODAL */
.ec-overlay{position:fixed;inset:0;z-index:80;background:rgba(26,28,34,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:ecFade .3s ease}
@keyframes ecFade{from{opacity:0}to{opacity:1}}
.ec-modal{position:relative;background:var(--cream);border-radius:10px;max-width:920px;width:100%;max-height:90vh;overflow:auto;display:grid;grid-template-columns:1fr 1fr;animation:ecPop .4s cubic-bezier(.2,.7,.2,1)}
@keyframes ecPop{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:none}}
.ec-modal-close{position:absolute;top:1rem;right:1rem;z-index:5;width:40px;height:40px;border-radius:50%;background:rgba(250,247,242,.8);display:flex;align-items:center;justify-content:center;color:var(--ink)}
.ec-modal-media{background:linear-gradient(160deg,#fbfaf6,#e7e2d6);display:flex;align-items:center;justify-content:center;min-height:340px}
.ec-modal-media .ec-visual{height:90%}
.ec-modal-info{padding:clamp(1.6rem,4vw,2.6rem)}
.ec-modal-name{font-family:var(--serif);font-weight:600;font-size:clamp(1.8rem,3.5vw,2.6rem);line-height:1.1;margin:.5rem 0 .3rem}
.ec-modal-price{font-size:1.2rem;font-weight:600;color:var(--ink)}
.ec-modal-desc{margin:1.1rem 0;line-height:1.7;color:var(--ink-soft)}
.ec-specs{display:flex;gap:2.5rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1.1rem 0;margin-bottom:1.4rem}
.ec-specs dt{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:.3rem}
.ec-specs dd{font-family:var(--serif);font-size:1.05rem}
.ec-len{margin-bottom:1.6rem}
.ec-len-label{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);display:block;margin-bottom:.6rem}
.ec-len-opts{display:flex;gap:.6rem;flex-wrap:wrap}
.ec-len-opt{min-width:54px;height:42px;padding:0 .6rem;border-radius:4px;border:1px solid var(--line-strong);font-size:.85rem;font-weight:500;transition:.25s}
.ec-len-opt:hover:not(:disabled):not(.is-on){border-color:var(--ink)}
.ec-len-opt.is-on{background:var(--ink);color:var(--text-inverse);border-color:var(--ink)}
.ec-len-opt:disabled{opacity:.35;text-decoration:line-through}
.ec-stock{font-size:.78rem;margin-bottom:1rem;letter-spacing:.04em}
.ec-stock.is-low{color:var(--gold)}
.ec-stock.is-out{color:var(--error)}
.ec-modal-note{margin-top:1rem;font-size:.76rem;color:var(--ink-soft);text-align:center}

/* CART */
.ec-scrim{position:fixed;inset:0;z-index:90;background:rgba(26,28,34,.4);opacity:0;visibility:hidden;transition:.35s}
.ec-scrim.is-open{opacity:1;visibility:visible}
.ec-cart{position:fixed;top:0;right:0;bottom:0;z-index:95;width:min(440px,100%);background:var(--cream);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .42s cubic-bezier(.4,0,.1,1);box-shadow:-20px 0 60px -20px rgba(26,28,34,.4)}
.ec-cart.is-open{transform:none}
.ec-cart-head{display:flex;justify-content:space-between;align-items:center;padding:1.6rem;border-bottom:1px solid var(--line)}
.ec-cart-head h2{font-family:var(--serif);font-weight:400;font-size:1.4rem}
.ec-cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;color:var(--ink-soft);text-align:center;padding:2rem}
.ec-cart-empty svg{color:var(--gold);opacity:.6}
.ec-cart-items{flex:1;overflow:auto;padding:1rem 1.6rem}
.ec-sale-banner{display:flex;align-items:center;gap:.5rem;background:var(--cream-2);color:var(--gold);font-size:.76rem;letter-spacing:.1em;text-transform:uppercase;padding:.6rem .8rem;border-radius:6px;margin-bottom:1rem}
.ec-cart-item{display:flex;gap:1rem;padding:1.1rem 0;border-bottom:1px solid var(--line)}
.ec-cart-thumb{width:76px;height:92px;border-radius:5px;overflow:hidden;background:linear-gradient(160deg,#fbfaf6,#e7e2d6);flex-shrink:0}
.ec-cart-detail{flex:1}
.ec-cart-toprow{display:flex;justify-content:space-between;align-items:flex-start}
.ec-cart-detail h4{font-family:var(--serif);font-weight:400;font-size:1.05rem}
.ec-cart-remove{color:var(--ink-soft);padding:.2rem;transition:.2s}
.ec-cart-remove:hover{color:var(--ink)}
.ec-cart-sub{font-size:.78rem;color:var(--ink-soft);margin:.2rem 0 .7rem}
.ec-cart-bottomrow{display:flex;justify-content:space-between;align-items:center}
.ec-qty{display:flex;align-items:center;gap:.7rem;border:1px solid var(--line);border-radius:999px;padding:.25rem .5rem}
.ec-qty button{width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:var(--ink)}
.ec-qty span{font-size:.85rem;min-width:14px;text-align:center}
.ec-cart-price{font-size:.95rem}
.ec-cart-foot{padding:1.6rem;border-top:1px solid var(--line);background:var(--cream-2)}
.ec-discount{margin-bottom:1.1rem}
.ec-discount-row{display:flex;gap:.5rem}
.ec-discount-row input{flex:1;padding:.7rem 1rem;border-radius:4px;border:1px solid var(--line-strong);background:var(--bg-elevated);color:var(--ink);outline:none;font-size:.82rem;letter-spacing:.06em;transition:border-color .2s}
.ec-discount-row input:focus{border-color:var(--silver-dark)}
.ec-discount-apply{padding:.7rem 1.2rem;border-radius:4px;border:1px solid var(--ink);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;font-weight:500;transition:.25s}
.ec-discount-apply:hover:not(:disabled){background:var(--ink);color:var(--cream)}
.ec-discount-apply:disabled{opacity:.4}
.ec-discount-msg{display:flex;align-items:center;gap:.4rem;font-size:.78rem;margin-top:.5rem}
.ec-discount-msg.is-err{color:var(--error)}
.ec-discount-msg.is-ok{color:var(--success)}
.ec-cart-lines{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.8rem;font-size:.86rem;color:var(--ink-soft)}
.ec-cart-line{display:flex;justify-content:space-between}
.ec-cart-line.is-discount{color:var(--success)}
.ec-cart-subtotal{display:flex;justify-content:space-between;font-family:var(--serif);font-size:1.2rem;margin-bottom:1rem;color:var(--ink)}
.ec-cart-ship{font-size:.78rem;color:var(--ink-soft);margin-top:.6rem;text-align:center}
.ec-cart-ship code{font-family:ui-monospace,monospace}

/* SEARCH */
.ec-search-overlay{position:fixed;inset:0;z-index:100;background:rgba(250,247,242,.94);backdrop-filter:blur(10px);padding:clamp(1rem,5vw,4rem);animation:ecFade .25s ease}
.ec-search-panel{max-width:680px;margin:4rem auto 0}
.ec-search-bar{display:flex;align-items:center;gap:1rem;border-bottom:1px solid var(--ink);padding-bottom:1rem;color:var(--ink-soft)}
.ec-search-bar input{flex:1;border:none;background:none;outline:none;font-family:var(--serif);font-size:clamp(1.4rem,4vw,2.2rem);font-weight:500;color:var(--ink)}
.ec-search-bar input::placeholder{color:rgba(26,28,34,.3)}
.ec-search-results{margin-top:1.5rem;display:flex;flex-direction:column}
.ec-search-empty{color:var(--ink-soft);padding:1rem 0}
.ec-search-result{display:flex;align-items:center;gap:1.1rem;padding:.9rem .5rem;border-bottom:1px solid var(--line);text-align:left;transition:.2s}
.ec-search-result:hover{padding-left:1rem;background:rgba(26,28,34,.03)}
.ec-search-thumb{width:50px;height:62px;border-radius:4px;overflow:hidden;background:linear-gradient(160deg,#fbfaf6,#e7e2d6);flex-shrink:0}
.ec-search-name{flex:1;font-family:var(--serif);font-size:1.15rem;display:flex;flex-direction:column}
.ec-search-name em{font-family:var(--sans);font-style:normal;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-top:.2rem}
.ec-search-price{color:var(--ink-soft)}

/* NEWSLETTER */
.ec-news{background:var(--ink);color:var(--cream);text-align:center;padding:clamp(4rem,8vw,7rem) 1.5rem;position:relative;overflow:hidden}
.ec-news::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(201,168,106,.18),transparent 60%)}
.ec-news-inner{position:relative;max-width:520px;margin:0 auto}
.ec-news-spark{color:var(--champagne);margin-bottom:1rem;animation:ecTwinkle 4s ease-in-out infinite}
.ec-news h2{font-family:var(--serif);font-weight:600;font-size:clamp(2rem,5vw,3rem);margin-bottom:.7rem}
.ec-news p{color:rgba(250,247,242,.7);margin-bottom:2rem}
.ec-news-form{display:flex;gap:.6rem;max-width:420px;margin:0 auto}
.ec-news-form input{flex:1;padding:1rem 1.3rem;border-radius:4px;border:1px solid rgba(250,247,242,.25);background:rgba(250,247,242,.06);color:var(--text-inverse);outline:none}
.ec-news-form input::placeholder{color:rgba(250,247,242,.45)}
.ec-news-form .ec-btn-dark{background:var(--cream);color:var(--ink);white-space:nowrap}
.ec-news-form .ec-btn-dark:hover{background:var(--champagne)}
.ec-news-done{font-family:var(--serif);font-style:italic;font-size:1.2rem;color:var(--champagne)}

/* ORDER STATUS */
.ec-order{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:clamp(2rem,6vw,5rem) 1.5rem;background:
  radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,.9), transparent 60%), var(--cream)}
.ec-order-inner{width:100%;max-width:560px}
.ec-order-logo{justify-content:center;width:100%;margin-bottom:2rem}
.ec-order-card{background:var(--cream);border:1px solid var(--line);border-radius:12px;padding:clamp(1.8rem,5vw,3rem);text-align:center;box-shadow:0 30px 70px -40px rgba(26,28,34,.4)}
.ec-order-card h2{font-family:var(--serif);font-weight:600;font-size:clamp(1.7rem,4vw,2.4rem);margin-bottom:.4rem}
.ec-order-icon{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--champagne);margin-bottom:1.2rem}
.ec-order-icon.sm{width:42px;height:42px;background:var(--cream-2);color:var(--gold);margin:0}
.ec-order-state{color:var(--gold);letter-spacing:.04em;margin-bottom:.4rem}
.ec-order-email{font-size:.88rem;color:var(--ink-soft);margin-bottom:1.6rem}
.ec-order-loading .ec-news-spark{color:var(--gold)}
.ec-order-items{text-align:left;border-top:1px solid var(--line);margin-top:1.4rem;padding-top:1.2rem}
.ec-order-row{display:flex;justify-content:space-between;gap:1rem;padding:.4rem 0;font-size:.92rem;color:var(--ink-soft)}
.ec-order-total{border-top:1px solid var(--line);margin-top:.6rem;padding-top:.8rem;font-family:var(--serif);font-size:1.15rem;color:var(--ink)}
.ec-order-selections,.ec-order-ship{text-align:left;margin-top:1.6rem}
.ec-order-selections h3,.ec-order-ship h3{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:.6rem}
.ec-order-selections p,.ec-order-ship p{font-size:.9rem;line-height:1.6;color:var(--ink)}
.ec-order-tracking{display:flex;align-items:center;gap:1rem;text-align:left;background:var(--cream-2);border-radius:8px;padding:1rem;margin-top:1.6rem}
.ec-order-track-label{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:.2rem}
.ec-order-tracking a{font-family:var(--serif);font-size:1.05rem;color:var(--ink);word-break:break-all}
.ec-order-card .ec-btn{margin-top:1.8rem}

/* FOOTER */
.ec-footer{background:var(--bg-dark);color:var(--text-inverse);padding:clamp(3.5rem,6vw,5.5rem) clamp(1rem,4vw,3.5rem) 2rem}
.ec-footer-top{display:grid;grid-template-columns:1.4fr 2fr;gap:3rem;max-width:1280px;margin:0 auto;padding-bottom:3rem;border-bottom:1px solid rgba(250,247,242,.12)}
.ec-logo-foot{font-size:1.5rem}
.ec-footer-brand p{margin-top:1rem;color:rgba(250,247,242,.55);line-height:1.75;max-width:34ch;font-size:.92rem}
.ec-footer-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.ec-footer-cols h4{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;margin-bottom:1rem;color:var(--text-inverse)}
.ec-footer-cols button{display:block;font-size:.88rem;color:rgba(250,247,242,.6);padding:.3rem 0;transition:.2s}
.ec-footer-cols button:hover{color:var(--text-inverse);padding-left:.3rem}
.ec-footer-bottom{display:flex;justify-content:space-between;max-width:1280px;margin:1.6rem auto 0;font-size:.78rem;color:rgba(250,247,242,.5)}
.ec-footer-tag{font-family:var(--serif);font-style:italic}

/* RESPONSIVE */
@media(max-width:820px){
  .ec-story-inner{grid-template-columns:1fr}
  .ec-modal{grid-template-columns:1fr}
  .ec-modal-media{min-height:300px}
  .ec-footer-top{grid-template-columns:1fr}
}
@media(max-width:620px){
  .ec-hide-sm{display:none}
  .ec-header{grid-template-columns:1fr auto 1fr;padding:1.1rem 1.2rem}
  .ec-logo{grid-column:2}
  .ec-bag{grid-column:3}
  .ec-footer-cols{grid-template-columns:1fr 1fr}
  .ec-footer-bottom{flex-direction:column;gap:.4rem}
  .ec-news-form{flex-direction:column}
}

/* ======================================================================== */
/* ===================  EDITORIAL REDESIGN (art-directed)  ================ */
/* ======================================================================== */

/* shared editorial kicker label */
.ec-kicker{display:inline-block;font-family:var(--sans);font-size:.66rem;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--ink-soft)}
.ec-kicker-light{color:rgba(250,247,242,.55)}

/* ---- HEADER : nav · wordmark · actions ---- */
.ec-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem;padding:1.7rem clamp(1.2rem,5vw,4.5rem);color:var(--text-inverse)}
.ec-header.is-scrolled{background:rgba(250,247,242,.92);backdrop-filter:blur(16px);padding-top:1.1rem;padding-bottom:1.1rem;box-shadow:0 1px 0 var(--line);color:var(--ink)}
.ec-header-nav{display:flex;gap:1.8rem;justify-self:start}
.ec-header-actions{display:flex;gap:1.8rem;justify-self:end}
.ec-nav-link{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:inherit;opacity:.82;font-weight:500;transition:opacity .2s}
.ec-nav-link:hover{opacity:1}
.ec-bag sup{font-size:.58rem;margin-left:.15em;font-feature-settings:"sups"}
.ec-logo{justify-self:center;font-family:var(--serif);font-size:1.7rem;font-weight:500;letter-spacing:.05em;color:inherit}

/* ---- HERO : asymmetric editorial composition ---- */
.ec-hero{position:relative;min-height:100vh;display:grid;grid-template-rows:1fr auto;padding:7.5rem clamp(1.2rem,5vw,4.5rem) 2.6rem;overflow:hidden;background:#0c0c0c;color:var(--text-inverse)}
.ec-hero-bg{position:absolute;inset:0;z-index:0;background:
  radial-gradient(ellipse 55% 45% at 72% 30%, rgba(232,232,232,.14), transparent 60%),
  radial-gradient(ellipse 70% 55% at 25% 88%, rgba(201,169,98,.10), transparent 62%),
  #0c0c0c}
.ec-hero-edge{position:absolute;z-index:2;top:50%;font-size:.62rem;letter-spacing:.36em;text-transform:uppercase;color:rgba(250,247,242,.42);writing-mode:vertical-rl}
.ec-hero-edge-l{left:clamp(.5rem,1.8vw,1.4rem);transform:translateY(-50%) rotate(180deg)}
.ec-hero-edge-r{right:clamp(.5rem,1.8vw,1.4rem);transform:translateY(-50%)}
.ec-hero-grid{position:relative;z-index:2;align-self:center;display:grid;grid-template-columns:1.18fr .82fr;align-items:center;gap:clamp(2rem,5vw,5rem);width:100%;max-width:1440px;margin:0 auto}
.ec-hero-title{font-family:var(--serif);font-weight:500;font-size:clamp(3.1rem,11vw,8.6rem);line-height:.9;letter-spacing:-.025em;margin:0}
.ec-hero-title span{display:block}
.ec-hero-title em{font-style:italic;font-weight:400}
.ec-hero-feature{position:relative}
.ec-hero-feature-frame{aspect-ratio:4/5;border-radius:8px;overflow:hidden;background:linear-gradient(165deg,#1d1d1d,#0b0b0b);border:1px solid rgba(250,247,242,.1)}
.ec-hero-feature-frame .ec-visual{height:100%}
.ec-hero-feature-cap{margin-top:1rem;display:flex;justify-content:space-between;align-items:baseline;gap:1rem;width:100%;color:rgba(250,247,242,.72)}
.ec-hero-feature-name{font-family:var(--serif);font-style:italic;font-size:1.05rem}
.ec-hero-feature-price{font-size:.85rem;letter-spacing:.04em}
.ec-hero-foot{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;width:100%;max-width:1440px;margin:0 auto;padding-top:1.8rem;border-top:1px solid rgba(250,247,242,.16)}
.ec-hero-note{max-width:34ch;font-size:.92rem;line-height:1.7;color:rgba(250,247,242,.62)}

/* ---- MANIFESTO : large statement (replaces marquee) ---- */
.ec-manifesto{max-width:1440px;margin:0 auto;padding:clamp(5rem,11vw,9rem) clamp(1.2rem,5vw,4.5rem);display:grid;grid-template-columns:auto 1fr;gap:clamp(1.4rem,5vw,5rem)}
.ec-manifesto .ec-kicker{padding-top:1rem;white-space:nowrap}
.ec-manifesto-text{font-family:var(--serif);font-weight:400;font-size:clamp(1.7rem,3.8vw,3.1rem);line-height:1.3;letter-spacing:-.012em;color:var(--ink);max-width:20ch}
.ec-manifesto-text em{font-style:italic}

/* ---- SHOP : editorial header + staggered grid ---- */
.ec-shop{max-width:1440px;margin:0 auto;padding:clamp(2.5rem,5vw,4rem) clamp(1.2rem,5vw,4.5rem) clamp(5rem,9vw,8rem)}
.ec-shop-head{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(2.5rem,5vw,4.5rem);padding-top:2.2rem;border-top:1px solid var(--line)}
.ec-section-title{font-family:var(--serif);font-weight:500;font-size:clamp(2.6rem,6vw,5rem);line-height:.96;letter-spacing:-.022em;margin-top:.7rem}
.ec-section-title em{font-style:italic;font-weight:400}
.ec-shop-controls{display:flex;align-items:center;gap:1.4rem;flex-wrap:wrap;padding-bottom:.4rem}
.ec-chips{display:flex;gap:.3rem;flex-wrap:wrap}
.ec-chip{position:relative;padding:.45rem .85rem;border:none;border-radius:0;background:none;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);transition:color .2s}
.ec-chip:hover{color:var(--ink)}
.ec-chip.is-on{color:var(--ink)}
.ec-chip.is-on::after{content:"";position:absolute;left:.85rem;right:.85rem;bottom:0;height:1px;background:var(--ink)}
.ec-select{appearance:none;border:none;border-bottom:1px solid var(--line-strong);border-radius:0;background:none;padding:.45rem 1.9rem .45rem .1rem;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);cursor:pointer}
.ec-select-wrap::after{right:.4rem}
.ec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,3vw,3rem) clamp(1.4rem,2.4vw,2.4rem)}
.ec-grid .ec-card:nth-child(3n-1){transform:translateY(clamp(1.5rem,4vw,4rem))}

/* ---- CARD : numbered, image-forward ---- */
.ec-card{display:flex;flex-direction:column}
.ec-card-media{position:relative;border-radius:6px;overflow:hidden;aspect-ratio:3/4;background:linear-gradient(160deg,#fff,var(--cream-2));display:block;width:100%;box-shadow:0 0 0 1px rgba(20,20,20,.04);transition:box-shadow .45s}
.ec-card:hover .ec-card-media{box-shadow:0 28px 64px -30px rgba(20,20,20,.5)}
.ec-card-media .ec-visual-img,.ec-card-media .ec-visual-svg{transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.ec-card:hover .ec-card-media .ec-visual-img,.ec-card:hover .ec-card-media .ec-visual-svg{transform:scale(1.06)}
.ec-card-index{position:absolute;top:14px;left:16px;z-index:3;font-family:var(--sans);font-size:.72rem;letter-spacing:.08em;color:var(--ink-soft);font-variant-numeric:tabular-nums;mix-blend-mode:multiply}
.ec-card-body{padding:1.25rem .1rem 0}
.ec-card-row{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}
.ec-card-name{font-family:var(--serif);font-weight:500;font-size:1.4rem;line-height:1.1;letter-spacing:-.01em}
.ec-card-price{font-family:var(--sans);font-size:.95rem;font-weight:500;color:var(--ink);white-space:nowrap}
.ec-card-meta{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);margin-top:.55rem}
.ec-card-add{margin-top:1.1rem;display:inline-flex;flex-direction:column;align-items:flex-start;gap:.5rem;padding:0;border:none;background:none;color:var(--ink)}
.ec-card-add .ec-link-cta-row{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;font-weight:500;gap:.7rem}
.ec-card-add .ec-link-cta-line{width:86px}
.ec-card-add:hover .ec-link-cta-line{width:118px;opacity:.95}
.ec-card-add svg{transition:transform .3s}
.ec-card-add:hover svg{transform:translateX(5px)}

/* ---- VALUES : numbered editorial ---- */
.ec-values{max-width:1440px;margin:0 auto;padding:0 clamp(1.2rem,5vw,4.5rem) clamp(4rem,8vw,7rem)}
.ec-values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.8rem,3vw,3.5rem);border-top:1px solid var(--line);padding-top:clamp(2.5rem,5vw,4rem)}
.ec-value{text-align:left;padding:0}
.ec-value-num{display:block;font-family:var(--serif);font-style:italic;font-size:1.7rem;color:var(--silver-dark);margin-bottom:1rem}
.ec-value h3{font-family:var(--serif);font-weight:500;font-size:1.5rem;margin-bottom:.6rem;letter-spacing:-.01em}
.ec-value p{font-size:.95rem;line-height:1.72;color:var(--ink-soft);max-width:34ch;margin:0}

/* ---- STORY : full-bleed dark, oversized ---- */
.ec-story{background:var(--bg-dark);color:var(--text-inverse);padding:clamp(5rem,10vw,9rem) clamp(1.2rem,5vw,4.5rem)}
.ec-story-inner{display:grid;grid-template-columns:.82fr 1.18fr;align-items:center;gap:clamp(2rem,6vw,6rem);max-width:1440px;margin:0 auto}
.ec-story .ec-kicker{color:rgba(250,247,242,.55)}
.ec-story .ec-section-title{margin:.9rem 0 1.6rem}
.ec-story-visual{aspect-ratio:1;border-radius:8px;background:radial-gradient(circle at 40% 35%,#222,#0c0c0c 72%);overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid rgba(250,247,242,.08)}
.ec-story-text p{color:rgba(250,247,242,.68)}

/* ---- NEWSLETTER : big serif + underline field ---- */
.ec-news{background:var(--bg-dark);color:var(--text-inverse);padding:clamp(5rem,10vw,9rem) clamp(1.2rem,5vw,4.5rem);text-align:left}
.ec-news-inner{position:relative;max-width:1440px;margin:0 auto;text-align:left}
.ec-news h2{font-family:var(--serif);font-weight:500;font-size:clamp(2.6rem,7vw,5.5rem);line-height:.96;letter-spacing:-.022em;margin:.9rem 0 2.4rem;color:var(--text-inverse)}
.ec-news h2 em{font-style:italic;font-weight:400}
.ec-news-form{display:flex;align-items:center;gap:1rem;max-width:560px;border-bottom:1px solid rgba(250,247,242,.32);padding-bottom:1rem}
.ec-news-form input{flex:1;border:none;background:none;color:var(--text-inverse);outline:none;font-family:var(--sans);font-size:1.05rem;padding:0}
.ec-news-form input::placeholder{color:rgba(250,247,242,.4)}
.ec-news-submit{flex-shrink:0;width:48px;height:48px;border-radius:50%;border:1px solid rgba(250,247,242,.32);background:none;color:var(--text-inverse);display:flex;align-items:center;justify-content:center;transition:.3s}
.ec-news-submit:hover{background:var(--text-inverse);color:var(--bg-dark)}
.ec-news-done{font-family:var(--serif);font-style:italic;font-size:1.3rem;color:rgba(250,247,242,.85)}

/* ---- FOOTER : monumental wordmark ---- */
.ec-footer{background:var(--bg-dark);color:var(--text-inverse);padding:clamp(3rem,6vw,5rem) clamp(1.2rem,5vw,4.5rem) 2.2rem}
.ec-footer-word{display:block;width:100%;text-align:left;font-family:var(--serif);font-weight:500;font-size:clamp(3.6rem,17vw,13rem);line-height:.86;letter-spacing:-.025em;color:var(--text-inverse);margin-bottom:clamp(2rem,5vw,3.5rem);padding-bottom:clamp(1.5rem,4vw,3rem);border-bottom:1px solid rgba(250,247,242,.12)}
.ec-footer-top{display:grid;grid-template-columns:1fr 2fr;gap:3rem;max-width:1440px;margin:0 auto;padding-bottom:2.6rem;border:none}
.ec-footer-blurb{font-family:var(--serif);font-style:italic;color:rgba(250,247,242,.55);line-height:1.7;font-size:1rem;max-width:30ch}
.ec-footer-bottom{display:flex;justify-content:space-between;max-width:1440px;margin:1.6rem auto 0;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(250,247,242,.5)}

/* ---- responsive ---- */
@media(max-width:980px){
  .ec-hero-grid{grid-template-columns:1fr}
  .ec-hero-feature{display:none}
  .ec-story-inner{grid-template-columns:1fr}
  .ec-story-visual{display:none}
  .ec-footer-top{grid-template-columns:1fr;gap:2rem}
}
@media(max-width:760px){
  .ec-manifesto{grid-template-columns:1fr;gap:1rem}
  .ec-manifesto-text{max-width:none}
  .ec-grid{grid-template-columns:repeat(2,1fr)}
  .ec-grid .ec-card:nth-child(3n-1){transform:none}
  .ec-values-grid{grid-template-columns:1fr;gap:2.2rem}
  .ec-hero-edge{display:none}
}
@media(max-width:560px){
  .ec-header-nav{gap:1.1rem}
  .ec-header-actions{gap:1.1rem}
  .ec-grid{grid-template-columns:1fr}
  .ec-hero-foot{flex-direction:column;align-items:flex-start;gap:1.4rem}
  .ec-news-form{flex-direction:row}
}
`}</style>
  );
}
