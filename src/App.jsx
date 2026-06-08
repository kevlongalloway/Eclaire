import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   ÉCLAIRE — Luxury Jewelry Storefront
   ----------------------------------------------------------------------------
   DESIGN-ONLY. All data is mock. Backend integration points are marked with
   // BACKEND: ... comments. Replace PRODUCTS, cart submission, and search with
   real API calls when wiring this up.
   ============================================================================ */

/* ---------------------------------- DATA ---------------------------------- */
// BACKEND: replace with fetch('/api/products')
const PRODUCTS = [
  {
    id: "lumiere-rope",
    name: "Lumière Rope Chain",
    collection: "Signature Silver",
    price: 248,
    metal: "925 Sterling Silver",
    weight: "18.4g",
    length: '20"',
    width: "3mm",
    tag: "Bestseller",
    desc: "A tightly woven rope that throws light in every direction. Substantial on the skin, quietly assured.",
    swatch: "#C8CCD2",
  },
  {
    id: "clair-cuban",
    name: "Clair Cuban Link",
    collection: "Signature Silver",
    price: 312,
    metal: "925 Sterling Silver",
    weight: "26.1g",
    length: '22"',
    width: "5mm",
    tag: "New",
    desc: "Hand-polished interlocking links with real heft. The piece that anchors a wardrobe.",
    swatch: "#B9BEC6",
  },
  {
    id: "halo-box",
    name: "Halo Box Chain",
    collection: "Signature Silver",
    price: 196,
    metal: "925 Sterling Silver",
    weight: "11.2g",
    length: '18"',
    width: "2mm",
    tag: null,
    desc: "Clean geometric links that sit flat and catch a sharp, architectural glint.",
    swatch: "#CDD2D8",
  },
  {
    id: "serein-figaro",
    name: "Serein Figaro",
    collection: "Signature Silver",
    price: 224,
    metal: "925 Sterling Silver",
    weight: "15.8g",
    length: '20"',
    width: "4mm",
    tag: null,
    desc: "The rhythm of alternating links — a timeless pattern, weighted for the everyday.",
    swatch: "#C2C7CE",
  },
  {
    id: "etoile-snake",
    name: "Étoile Snake Chain",
    collection: "Signature Silver",
    price: 178,
    metal: "925 Sterling Silver",
    weight: "9.6g",
    length: '18"',
    width: "2mm",
    tag: null,
    desc: "Liquid-smooth and fluid, it moves like mercury and reads as pure light.",
    swatch: "#D1D5DA",
  },
  {
    id: "aube-curb",
    name: "Aube Curb Chain",
    collection: "Signature Silver",
    price: 268,
    metal: "925 Sterling Silver",
    weight: "21.0g",
    length: '22"',
    width: "4mm",
    tag: "Bestseller",
    desc: "Flattened, twisted links polished to a mirror. Bold without ever shouting.",
    swatch: "#BEC3CB",
  },
];

const COLLECTIONS = ["All", "Signature Silver"];

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
};

/* ----------------------- PRODUCT VISUAL (CSS render) ---------------------- */
/* A luminous abstract "chain on light" tile — works as a placeholder until
   real photography is dropped in. Each product gets a unique drape. */
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

/* -------------------------------- HEADER ---------------------------------- */
function Header({ count, onCart, onSearch, onNav, scrolled }) {
  return (
    <header className={`ec-header ${scrolled ? "is-scrolled" : ""}`}>
      <button className="ec-nav-link ec-hide-sm" onClick={() => onNav("shop")}>Shop</button>
      <button className="ec-nav-link ec-hide-sm" onClick={() => onNav("story")}>Our Story</button>
      <button className="ec-logo" onClick={() => onNav("top")} aria-label="Éclaire home">
        <span className="ec-logo-mark"><Icon.Spark width="14" height="14" /></span>
        Éclaire
      </button>
      <button className="ec-icon-btn ec-hide-sm" onClick={onSearch} aria-label="Search">
        <Icon.Search width="20" height="20" />
      </button>
      <button className="ec-icon-btn ec-bag" onClick={onCart} aria-label="Cart">
        <Icon.Bag width="20" height="20" />
        {count > 0 && <span className="ec-bag-count">{count}</span>}
      </button>
    </header>
  );
}

/* --------------------------------- HERO ----------------------------------- */
function Hero({ onShop }) {
  return (
    <section className="ec-hero">
      <div className="ec-hero-rays" aria-hidden />
      <div className="ec-hero-grain" aria-hidden />
      <div className="ec-hero-inner">
        <p className="ec-eyebrow ec-reveal" style={{ animationDelay: ".1s" }}>
          <Icon.Spark width="11" height="11" /> Solid 925 Sterling Silver
        </p>
        <h1 className="ec-hero-title">
          <span className="ec-reveal" style={{ animationDelay: ".22s" }}>Jewelry that</span>
          <span className="ec-reveal ec-italic" style={{ animationDelay: ".36s" }}>catches the light.</span>
        </h1>
        <p className="ec-hero-sub ec-reveal" style={{ animationDelay: ".52s" }}>
          Crafted with intention, weighted to last. Pieces that sparkle with genuine
          brilliance and feel like an heirloom from the very first wear.
        </p>
        <div className="ec-reveal" style={{ animationDelay: ".66s" }}>
          <button className="ec-btn ec-btn-dark" onClick={onShop}>
            Shop the collection <Icon.Arrow width="17" height="17" />
          </button>
        </div>
      </div>
      <div className="ec-hero-scroll ec-reveal" style={{ animationDelay: "1s" }}>
        <span>Scroll</span><i />
      </div>
    </section>
  );
}

/* ------------------------------ MARQUEE ----------------------------------- */
function Marquee() {
  const items = ["Brilliance, Beautifully Made", "Light. Crafted.", "Timeless Sparkle for Everyday", "Pieces That Feel Like Yours"];
  const row = [...items, ...items];
  return (
    <div className="ec-marquee" aria-hidden>
      <div className="ec-marquee-track">
        {row.map((t, i) => (
          <span key={i} className="ec-marquee-item">
            {t} <Icon.Spark width="13" height="13" className="ec-marquee-spark" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ PRODUCT CARD ------------------------------ */
function ProductCard({ product, onOpen, onAdd, index }) {
  const [hover, setHover] = useState(false);
  return (
    <article
      className="ec-card ec-reveal-up"
      style={{ animationDelay: `${index * 0.07}s` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button className="ec-card-media" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
        {product.tag && <span className={`ec-tag ec-tag-${product.tag.toLowerCase()}`}>{product.tag}</span>}
        <ProductVisual product={product} hover={hover} />
      </button>
      <div className="ec-card-body">
        <div className="ec-card-row">
          <h3 className="ec-card-name">{product.name}</h3>
          <span className="ec-card-price">${product.price}</span>
        </div>
        <p className="ec-card-meta">{product.metal} · {product.length}</p>
        <button className="ec-card-add" onClick={() => onAdd(product)}>
          Add to bag
        </button>
      </div>
    </article>
  );
}

/* ------------------------------ SHOP GRID --------------------------------- */
function Shop({ products, onOpen, onAdd, filter, setFilter, sort, setSort }) {
  return (
    <section className="ec-shop" id="shop">
      <div className="ec-shop-head">
        <div>
          <p className="ec-eyebrow"><Icon.Spark width="11" height="11" /> The Collection</p>
          <h2 className="ec-section-title">Signature Silver</h2>
        </div>
        <div className="ec-shop-controls">
          <div className="ec-chips">
            {COLLECTIONS.map((c) => (
              <button key={c} className={`ec-chip ${filter === c ? "is-on" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="ec-select-wrap">
            <select className="ec-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>
      <div className="ec-grid">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onOpen={onOpen} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ VALUES BAND ------------------------------- */
function Values() {
  const items = [
    { icon: Icon.Hand, t: "Made With Intention", d: "Every piece is hand-finished and considered, never mass-produced or rushed." },
    { icon: Icon.Gem, t: "Chosen for Brilliance", d: "Materials selected for natural light, weight, and a durability built to last." },
    { icon: Icon.Leaf, t: "Beyond the Season", d: "Designed to be worn and loved for years — never tied to a passing trend." },
  ];
  return (
    <section className="ec-values">
      <div className="ec-values-grid">
        {items.map((it, i) => {
          const I = it.icon;
          return (
            <div className="ec-value ec-reveal-up" style={{ animationDelay: `${i * 0.1}s` }} key={i}>
              <span className="ec-value-icon"><I width="26" height="26" /></span>
              <h3>{it.t}</h3>
              <p>{it.d}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- STORY ----------------------------------- */
function Story() {
  return (
    <section className="ec-story" id="story">
      <div className="ec-story-visual" aria-hidden>
        <div className="ec-story-orb" />
        <Icon.Spark className="ec-story-spark s1" width="60" height="60" />
        <Icon.Spark className="ec-story-spark s2" width="34" height="34" />
        <Icon.Spark className="ec-story-spark s3" width="22" height="22" />
      </div>
      <div className="ec-story-text">
        <p className="ec-eyebrow"><Icon.Spark width="11" height="11" /> Our Story</p>
        <h2 className="ec-section-title">Born to celebrate light<br/>in its most beautiful forms.</h2>
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
    </section>
  );
}

/* ---------------------------- PRODUCT DRAWER ------------------------------ */
function ProductModal({ product, onClose, onAdd }) {
  const [len, setLen] = useState(product?.length);
  const [width, setWidth] = useState(product?.width);
  useEffect(() => { setLen(product?.length); setWidth(product?.width); }, [product]);
  if (!product) return null;
  const lengths = ['18"', '20"', '22"'];
  const widths = ["2mm", "3mm", "4mm", "5mm"];
  return (
    <div className="ec-overlay" onClick={onClose}>
      <div className="ec-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ec-modal-close" onClick={onClose} aria-label="Close"><Icon.Close width="22" height="22" /></button>
        <div className="ec-modal-media">
          <ProductVisual product={product} hover />
        </div>
        <div className="ec-modal-info">
          <p className="ec-eyebrow">{product.collection}{product.tag ? ` · ${product.tag}` : ""}</p>
          <h2 className="ec-modal-name">{product.name}</h2>
          <p className="ec-modal-price">${product.price}</p>
          <p className="ec-modal-desc">{product.desc}</p>
          <dl className="ec-specs">
            <div><dt>Material</dt><dd>{product.metal}</dd></div>
            <div><dt>Weight</dt><dd>{product.weight}</dd></div>
          </dl>
          <div className="ec-len">
            <span className="ec-len-label">Length</span>
            <div className="ec-len-opts">
              {lengths.map((l) => (
                <button key={l} className={`ec-len-opt ${len === l ? "is-on" : ""}`} onClick={() => setLen(l)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="ec-len">
            <span className="ec-len-label">Width</span>
            <div className="ec-len-opts">
              {widths.map((w) => (
                <button key={w} className={`ec-len-opt ${width === w ? "is-on" : ""}`} onClick={() => setWidth(w)}>{w}</button>
              ))}
            </div>
          </div>
          <button className="ec-btn ec-btn-dark ec-full" onClick={() => { onAdd({ ...product, length: len, width }); onClose(); }}>
            Add to bag · ${product.price}
          </button>
          <p className="ec-modal-note">Ships in recyclable Éclaire packaging · 30-day returns</p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- CART ------------------------------------ */
function Cart({ open, items, onClose, onQty, onRemove }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
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
              {items.map((it) => (
                <div className="ec-cart-item" key={it.key}>
                  <div className="ec-cart-thumb"><ProductVisual product={it} hover={false} /></div>
                  <div className="ec-cart-detail">
                    <div className="ec-cart-toprow">
                      <h4>{it.name}</h4>
                      <button className="ec-cart-remove" onClick={() => onRemove(it.key)} aria-label="Remove"><Icon.Close width="15" height="15" /></button>
                    </div>
                    <p className="ec-cart-sub">{it.length} · {it.width} · {it.metal}</p>
                    <div className="ec-cart-bottomrow">
                      <div className="ec-qty">
                        <button onClick={() => onQty(it.key, -1)} aria-label="Decrease"><Icon.Minus width="15" height="15" /></button>
                        <span>{it.qty}</span>
                        <button onClick={() => onQty(it.key, 1)} aria-label="Increase"><Icon.Plus width="15" height="15" /></button>
                      </div>
                      <span className="ec-cart-price">${it.price * it.qty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ec-cart-foot">
              <div className="ec-cart-subtotal">
                <span>Subtotal</span><span>${subtotal}</span>
              </div>
              <p className="ec-cart-ship">Shipping & taxes calculated at checkout.</p>
              {/* BACKEND: wire this to your checkout/session endpoint */}
              <button className="ec-btn ec-btn-dark ec-full" onClick={() => alert("Checkout — connect to your backend here.")}>
                Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ------------------------------- SEARCH ----------------------------------- */
function SearchOverlay({ open, onClose, onOpenProduct }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open && ref.current) ref.current.focus(); if (!open) setQ(""); }, [open]);
  // BACKEND: replace local filter with /api/search?q=
  const results = q.trim()
    ? PRODUCTS.filter((p) => (p.name + p.collection + p.metal).toLowerCase().includes(q.toLowerCase()))
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
            {results.map((p) => (
              <button key={p.id} className="ec-search-result" onClick={() => { onOpenProduct(p); onClose(); }}>
                <span className="ec-search-thumb"><ProductVisual product={p} hover={false} /></span>
                <span className="ec-search-name">{p.name}<em>{p.collection}</em></span>
                <span className="ec-search-price">${p.price}</span>
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
        <Icon.Spark width="28" height="28" className="ec-news-spark" />
        <h2>Be first to the light.</h2>
        <p>New collections, early access, and the occasional note from the atelier.</p>
        {done ? (
          <p className="ec-news-done">Welcome to Éclaire — keep an eye on your inbox.</p>
        ) : (
          <div className="ec-news-form">
            {/* BACKEND: POST email to your list provider */}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
            <button className="ec-btn ec-btn-dark" onClick={() => email.includes("@") && setDone(true)}>Subscribe</button>
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
      <div className="ec-footer-top">
        <div className="ec-footer-brand">
          <span className="ec-logo ec-logo-foot"><span className="ec-logo-mark"><Icon.Spark width="13" height="13" /></span>Éclaire</span>
          <p>Brilliance, beautifully made. Solid 925 sterling silver, crafted to be worn and loved for years.</p>
        </div>
        <div className="ec-footer-cols">
          <div><h4>Shop</h4><button onClick={() => onNav("shop")}>Signature Silver</button><button onClick={() => onNav("shop")}>Bestsellers</button><button onClick={() => onNav("shop")}>New Arrivals</button></div>
          <div><h4>About</h4><button onClick={() => onNav("story")}>Our Story</button><button>Materials</button><button>Craftsmanship</button></div>
          <div><h4>Care</h4><button>Shipping</button><button>Returns</button><button>Jewelry Care</button></div>
        </div>
      </div>
      <div className="ec-footer-bottom">
        <span>© {new Date().getFullYear()} Éclaire. All rights reserved.</span>
        <span className="ec-footer-tag">Light. Crafted.</span>
      </div>
    </footer>
  );
}

/* ================================== APP =================================== */
export default function App() {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("featured");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll-reveal observer
  useEffect(() => {
    const els = document.querySelectorAll(".ec-reveal-up");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });

  const addToCart = useCallback((product) => {
    const key = `${product.id}-${product.length}-${product.width}`;
    setCart((c) => {
      const existing = c.find((i) => i.key === key);
      if (existing) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...product, key, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const changeQty = (key, d) =>
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
  const removeItem = (key) => setCart((c) => c.filter((i) => i.key !== key));

  const nav = (where) => {
    setCartOpen(false); setSearchOpen(false);
    if (where === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(where)?.scrollIntoView({ behavior: "smooth" });
  };

  let shown = filter === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.collection === filter);
  if (sort === "low") shown = [...shown].sort((a, b) => a.price - b.price);
  if (sort === "high") shown = [...shown].sort((a, b) => b.price - a.price);

  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="ec-root">
      <Styles />
      <Header count={count} scrolled={scrolled}
        onCart={() => setCartOpen(true)} onSearch={() => setSearchOpen(true)} onNav={nav} />
      <main>
        <Hero onShop={() => nav("shop")} />
        <Marquee />
        <Shop products={shown} onOpen={setActive} onAdd={addToCart}
          filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />
        <Values />
        <Story />
        <Newsletter />
      </main>
      <Footer onNav={nav} />
      <ProductModal product={active} onClose={() => setActive(null)} onAdd={addToCart} />
      <Cart open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeItem} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onOpenProduct={setActive} />
    </div>
  );
}

/* ================================ STYLES ================================== */
function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Jost:wght@300;400;500&display=swap');

:root{
  --cream:#f4f1ea;        /* warm paper base, NOT the usual jewelry black */
  --cream-2:#ece7dc;
  --ink:#1a1c22;
  --ink-soft:#4a4d57;
  --silver:#c8ccd2;
  --champagne:#e6d3b3;
  --gold:#c9a86a;
  --blush:#e9d4cf;
  --navy:#20242f;
  --line:rgba(26,28,34,.12);
  --serif:'Fraunces',Georgia,serif;
  --sans:'Jost',system-ui,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
.ec-root{background:var(--cream);color:var(--ink);font-family:var(--sans);font-weight:300;-webkit-font-smoothing:antialiased;overflow-x:hidden}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,select{font-family:inherit}
img{display:block;max-width:100%}

/* reveal */
@keyframes ecRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.ec-reveal{opacity:0;animation:ecRise .9s cubic-bezier(.2,.7,.2,1) forwards}
.ec-reveal-up{opacity:0;transform:translateY(30px);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}
.ec-reveal-up.is-in{opacity:1;transform:none}

.ec-eyebrow{display:inline-flex;align-items:center;gap:.5em;font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:400}
.ec-eyebrow svg{color:var(--gold)}
.ec-section-title{font-family:var(--serif);font-weight:300;font-size:clamp(2rem,4.5vw,3.4rem);line-height:1.05;letter-spacing:-.01em;margin-top:.5rem}
.ec-italic{font-style:italic}

.ec-btn{display:inline-flex;align-items:center;gap:.6em;padding:1rem 1.8rem;border-radius:999px;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;font-weight:400;transition:.3s}
.ec-btn-dark{background:var(--ink);color:var(--cream)}
.ec-btn-dark:hover{background:var(--navy);transform:translateY(-2px);box-shadow:0 14px 30px -12px rgba(26,28,34,.5)}
.ec-btn-dark svg{transition:transform .3s}
.ec-btn-dark:hover svg{transform:translateX(4px)}
.ec-full{width:100%;justify-content:center}

/* HEADER */
.ec-header{position:fixed;top:0;left:0;right:0;z-index:60;display:grid;grid-template-columns:1fr 1fr auto 1fr 1fr;align-items:center;gap:1rem;padding:1.5rem clamp(1rem,4vw,3.5rem);transition:.4s}
.ec-header.is-scrolled{background:rgba(244,241,234,.82);backdrop-filter:blur(14px);padding-top:1rem;padding-bottom:1rem;box-shadow:0 1px 0 var(--line)}
.ec-nav-link{font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);transition:.25s;justify-self:start}
.ec-header .ec-nav-link:nth-of-type(2){justify-self:start}
.ec-nav-link:hover{color:var(--ink)}
.ec-logo{grid-column:3;display:inline-flex;align-items:center;gap:.45em;font-family:var(--serif);font-size:1.7rem;font-weight:400;letter-spacing:.02em}
.ec-logo-mark{color:var(--gold);display:inline-flex;animation:ecTwinkle 4s ease-in-out infinite}
@keyframes ecTwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.82) rotate(8deg)}}
.ec-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;color:var(--ink);transition:.25s}
.ec-icon-btn:hover{background:rgba(26,28,34,.06)}
.ec-header .ec-icon-btn:nth-of-type(1){justify-self:end}
.ec-bag{grid-column:5;justify-self:end;position:relative}
.ec-bag-count{position:absolute;top:2px;right:2px;background:var(--gold);color:#fff;font-size:.6rem;font-weight:500;min-width:17px;height:17px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 4px}

/* HERO */
.ec-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:7rem 1.5rem 4rem;overflow:hidden}
.ec-hero-rays{position:absolute;inset:-30% -10% auto 50%;transform:translateX(-50%);width:140vw;height:120vh;background:
  radial-gradient(ellipse 50% 55% at 50% 38%, rgba(255,255,255,.95), rgba(244,241,234,0) 60%),
  conic-gradient(from 200deg at 50% 35%, transparent 0deg, rgba(201,168,106,.10) 20deg, transparent 40deg, rgba(201,168,106,.08) 70deg, transparent 95deg, rgba(186,191,200,.12) 130deg, transparent 160deg);
  filter:blur(2px);animation:ecRays 22s linear infinite}
@keyframes ecRays{to{transform:translateX(-50%) rotate(360deg)}}
.ec-hero-grain{position:absolute;inset:0;opacity:.5;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")}
.ec-hero-inner{position:relative;max-width:760px;z-index:2}
.ec-hero-title{font-family:var(--serif);font-weight:300;font-size:clamp(2.8rem,8vw,6rem);line-height:.98;letter-spacing:-.02em;margin:1.4rem 0}
.ec-hero-title span{display:block}
.ec-hero-sub{max-width:480px;margin:0 auto 2.2rem;font-size:1.04rem;line-height:1.7;color:var(--ink-soft)}
.ec-hero-scroll{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.6rem;font-size:.66rem;letter-spacing:.3em;text-transform:uppercase;color:var(--ink-soft)}
.ec-hero-scroll i{width:1px;height:42px;background:linear-gradient(var(--ink-soft),transparent);animation:ecDrop 2s ease-in-out infinite}
@keyframes ecDrop{0%,100%{transform:scaleY(.4);transform-origin:top;opacity:.4}50%{transform:scaleY(1);opacity:1}}

/* MARQUEE */
.ec-marquee{background:var(--ink);color:var(--cream);padding:1.1rem 0;overflow:hidden;white-space:nowrap}
.ec-marquee-track{display:inline-flex;gap:3rem;animation:ecScroll 32s linear infinite}
.ec-marquee-item{display:inline-flex;align-items:center;gap:1.4rem;font-family:var(--serif);font-style:italic;font-size:1.2rem;letter-spacing:.01em}
.ec-marquee-spark{color:var(--champagne)}
@keyframes ecScroll{to{transform:translateX(-50%)}}

/* SHOP */
.ec-shop{max-width:1280px;margin:0 auto;padding:clamp(4rem,9vw,7rem) clamp(1rem,4vw,3.5rem)}
.ec-shop-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1.5rem;margin-bottom:2.8rem}
.ec-shop-controls{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.ec-chips{display:flex;gap:.5rem}
.ec-chip{padding:.55rem 1.1rem;border-radius:999px;border:1px solid var(--line);font-size:.78rem;letter-spacing:.06em;color:var(--ink-soft);transition:.25s}
.ec-chip.is-on{background:var(--ink);color:var(--cream);border-color:var(--ink)}
.ec-select-wrap{position:relative}
.ec-select{appearance:none;padding:.6rem 2.2rem .6rem 1rem;border-radius:999px;border:1px solid var(--line);background:transparent;font-size:.78rem;color:var(--ink);cursor:pointer}
.ec-select-wrap::after{content:"";position:absolute;right:1rem;top:50%;width:7px;height:7px;border-right:1.5px solid var(--ink-soft);border-bottom:1.5px solid var(--ink-soft);transform:translateY(-65%) rotate(45deg);pointer-events:none}
.ec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:clamp(1.2rem,3vw,2.4rem)}

/* CARD */
.ec-card{display:flex;flex-direction:column}
.ec-card-media{position:relative;border-radius:6px;overflow:hidden;aspect-ratio:4/5;background:linear-gradient(160deg,#fbfaf6,#e7e2d6);display:block;width:100%}
.ec-tag{position:absolute;top:14px;left:14px;z-index:3;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;padding:.4rem .7rem;border-radius:999px;background:rgba(244,241,234,.85);backdrop-filter:blur(6px);color:var(--ink);font-weight:400}
.ec-tag-new{background:var(--ink);color:var(--champagne)}
.ec-tag-bestseller{background:var(--gold);color:#fff}
.ec-card-body{padding:1.1rem .1rem 0}
.ec-card-row{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}
.ec-card-name{font-family:var(--serif);font-weight:400;font-size:1.25rem;letter-spacing:-.01em}
.ec-card-price{font-size:.95rem;color:var(--ink)}
.ec-card-meta{font-size:.78rem;color:var(--ink-soft);margin-top:.25rem;letter-spacing:.02em}
.ec-card-add{margin-top:.9rem;width:100%;padding:.8rem;border:1px solid var(--line);border-radius:999px;font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);transition:.28s}
.ec-card-add:hover{background:var(--ink);color:var(--cream);border-color:var(--ink)}

/* PRODUCT VISUAL */
.ec-visual{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ec-visual-glow{position:absolute;width:75%;height:60%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,255,255,0) 70%);filter:blur(6px)}
.ec-visual-svg{position:relative;height:86%;width:auto;z-index:2;filter:drop-shadow(0 6px 16px rgba(60,64,73,.28))}
.ec-visual-sheen{position:absolute;top:0;left:-60%;width:50%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.7),transparent);transform:skewX(-18deg);transition:left .7s ease;z-index:3;pointer-events:none}
.ec-card-media:hover .ec-visual-sheen{left:120%}

/* VALUES */
.ec-values{max-width:1280px;margin:0 auto;padding:0 clamp(1rem,4vw,3.5rem) clamp(3rem,7vw,6rem)}
.ec-values-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:2rem;border-top:1px solid var(--line);padding-top:clamp(2.5rem,5vw,4rem)}
.ec-value{text-align:center;padding:0 1rem}
.ec-value-icon{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:var(--cream-2);color:var(--gold);margin-bottom:1.1rem}
.ec-value h3{font-family:var(--serif);font-weight:400;font-size:1.3rem;margin-bottom:.5rem}
.ec-value p{font-size:.92rem;line-height:1.65;color:var(--ink-soft);max-width:280px;margin:0 auto}

/* STORY */
.ec-story{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(2rem,6vw,5rem);max-width:1280px;margin:0 auto;padding:clamp(3rem,7vw,7rem) clamp(1rem,4vw,3.5rem)}
.ec-story-visual{position:relative;aspect-ratio:1;border-radius:8px;background:radial-gradient(circle at 40% 35%,#fff,#e9e3d6 70%,#d8d1c2);overflow:hidden;display:flex;align-items:center;justify-content:center}
.ec-story-orb{width:55%;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 0deg,var(--silver),#fff,var(--champagne),var(--gold),var(--silver));filter:blur(2px);animation:ecSpin 18s linear infinite;box-shadow:inset 0 0 60px rgba(255,255,255,.6),0 20px 50px -20px rgba(60,64,73,.5)}
@keyframes ecSpin{to{transform:rotate(360deg)}}
.ec-story-spark{position:absolute;color:#fff;filter:drop-shadow(0 0 10px rgba(255,255,255,.9))}
.ec-story-spark.s1{top:18%;right:20%;animation:ecTwinkle 3.5s ease-in-out infinite}
.ec-story-spark.s2{bottom:24%;left:18%;animation:ecTwinkle 4.5s ease-in-out infinite .5s}
.ec-story-spark.s3{top:30%;left:26%;animation:ecTwinkle 5s ease-in-out infinite 1s}
.ec-story-text p{margin-top:1.1rem;font-size:1rem;line-height:1.75;color:var(--ink-soft);max-width:46ch}
.ec-story-text .ec-section-title{margin-bottom:.4rem}
.ec-signature{font-family:var(--serif);font-style:italic;color:var(--ink) !important;margin-top:1.5rem !important}

/* OVERLAYS / MODAL */
.ec-overlay{position:fixed;inset:0;z-index:80;background:rgba(26,28,34,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:ecFade .3s ease}
@keyframes ecFade{from{opacity:0}to{opacity:1}}
.ec-modal{position:relative;background:var(--cream);border-radius:10px;max-width:920px;width:100%;max-height:90vh;overflow:auto;display:grid;grid-template-columns:1fr 1fr;animation:ecPop .4s cubic-bezier(.2,.7,.2,1)}
@keyframes ecPop{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:none}}
.ec-modal-close{position:absolute;top:1rem;right:1rem;z-index:5;width:40px;height:40px;border-radius:50%;background:rgba(244,241,234,.8);display:flex;align-items:center;justify-content:center;color:var(--ink)}
.ec-modal-media{background:linear-gradient(160deg,#fbfaf6,#e7e2d6);display:flex;align-items:center;justify-content:center;min-height:340px}
.ec-modal-media .ec-visual{height:90%}
.ec-modal-info{padding:clamp(1.6rem,4vw,2.6rem)}
.ec-modal-name{font-family:var(--serif);font-weight:300;font-size:clamp(1.8rem,3.5vw,2.6rem);margin:.5rem 0 .3rem}
.ec-modal-price{font-size:1.2rem;color:var(--ink)}
.ec-modal-desc{margin:1.1rem 0;line-height:1.7;color:var(--ink-soft)}
.ec-specs{display:flex;gap:2.5rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1.1rem 0;margin-bottom:1.4rem}
.ec-specs dt{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:.3rem}
.ec-specs dd{font-family:var(--serif);font-size:1.05rem}
.ec-len{margin-bottom:1.6rem}
.ec-len-label{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);display:block;margin-bottom:.6rem}
.ec-len-opts{display:flex;gap:.6rem}
.ec-len-opt{width:54px;height:42px;border-radius:6px;border:1px solid var(--line);font-size:.85rem;transition:.25s}
.ec-len-opt.is-on{background:var(--ink);color:var(--cream);border-color:var(--ink)}
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
.ec-cart-subtotal{display:flex;justify-content:space-between;font-family:var(--serif);font-size:1.2rem;margin-bottom:.4rem}
.ec-cart-ship{font-size:.78rem;color:var(--ink-soft);margin-bottom:1.1rem}

/* SEARCH */
.ec-search-overlay{position:fixed;inset:0;z-index:100;background:rgba(244,241,234,.94);backdrop-filter:blur(10px);padding:clamp(1rem,5vw,4rem);animation:ecFade .25s ease}
.ec-search-panel{max-width:680px;margin:4rem auto 0}
.ec-search-bar{display:flex;align-items:center;gap:1rem;border-bottom:1px solid var(--ink);padding-bottom:1rem;color:var(--ink-soft)}
.ec-search-bar input{flex:1;border:none;background:none;outline:none;font-family:var(--serif);font-size:clamp(1.4rem,4vw,2.2rem);font-weight:300;color:var(--ink)}
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
.ec-news h2{font-family:var(--serif);font-weight:300;font-size:clamp(2rem,5vw,3rem);margin-bottom:.7rem}
.ec-news p{color:rgba(244,241,234,.7);margin-bottom:2rem}
.ec-news-form{display:flex;gap:.6rem;max-width:420px;margin:0 auto}
.ec-news-form input{flex:1;padding:1rem 1.3rem;border-radius:999px;border:1px solid rgba(244,241,234,.25);background:rgba(244,241,234,.06);color:var(--cream);outline:none}
.ec-news-form input::placeholder{color:rgba(244,241,234,.45)}
.ec-news-form .ec-btn-dark{background:var(--cream);color:var(--ink);white-space:nowrap}
.ec-news-form .ec-btn-dark:hover{background:var(--champagne)}
.ec-news-done{font-family:var(--serif);font-style:italic;font-size:1.2rem;color:var(--champagne)}

/* FOOTER */
.ec-footer{background:var(--cream-2);padding:clamp(3rem,6vw,5rem) clamp(1rem,4vw,3.5rem) 2rem}
.ec-footer-top{display:grid;grid-template-columns:1.4fr 2fr;gap:3rem;max-width:1280px;margin:0 auto;padding-bottom:3rem;border-bottom:1px solid var(--line)}
.ec-logo-foot{font-size:1.5rem}
.ec-footer-brand p{margin-top:1rem;color:var(--ink-soft);line-height:1.7;max-width:34ch;font-size:.92rem}
.ec-footer-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.ec-footer-cols h4{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;margin-bottom:1rem;color:var(--ink)}
.ec-footer-cols button{display:block;font-size:.88rem;color:var(--ink-soft);padding:.3rem 0;transition:.2s}
.ec-footer-cols button:hover{color:var(--ink);padding-left:.3rem}
.ec-footer-bottom{display:flex;justify-content:space-between;max-width:1280px;margin:1.6rem auto 0;font-size:.78rem;color:var(--ink-soft)}
.ec-footer-tag{font-family:var(--serif);font-style:italic}

/* RESPONSIVE */
@media(max-width:820px){
  .ec-story{grid-template-columns:1fr}
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
`}</style>
  );
}
