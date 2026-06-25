import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import CartDrawer from "./CartDrawer.jsx";
import Toast from "./Toast.jsx";

const NAV_LINKS = [
  { to: "/shop", label: "Shop" },
  { to: "/story", label: "Our Story" },
  { to: "/journal", label: "Journal" },
  { to: "/care", label: "Shipping & Care" },
  { to: "/contact", label: "Contact" },
];

const RAIL_ITEMS = [
  "Solid 925 sterling silver",
  "Free shipping, every order",
  "Hand-finished in the atelier",
  "30-day returns",
];

export default function Layout() {
  const { count, groups, openCart } = useStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [searchOpen]);

  const term = searchTerm.trim().toLowerCase();
  const results = term
    ? groups.filter((g) => g.name.toLowerCase().includes(term) || (g.collection || "").toLowerCase().includes(term)).slice(0, 6)
    : [];

  function goToFirstResult(e) {
    e.preventDefault();
    if (results[0]) {
      setSearchOpen(false);
      navigate(`/product/${encodeURIComponent(results[0].key)}`);
    }
  }

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="container nav-row">
          <Link className="wordmark" to="/">
            Éclaire
            <small>Atelier · 925</small>
          </Link>

          <nav className="site-nav">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions" ref={searchRef}>
            <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            {searchOpen && (
              <div className="search-pop">
                <form onSubmit={goToFirstResult}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search pieces…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </form>
                {term && (
                  <div className="search-results">
                    {results.length === 0 ? (
                      <p className="search-empty">No pieces match “{searchTerm}”.</p>
                    ) : (
                      results.map((g) => (
                        <Link
                          key={g.key}
                          to={`/product/${encodeURIComponent(g.key)}`}
                          onClick={() => setSearchOpen(false)}
                        >
                          <span>{g.name}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <button className="icon-btn" aria-label="Open bag" onClick={openCart}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l-1 13H7L6 7Z" />
                <path d="M9 7a3 3 0 1 1 6 0" />
              </svg>
              <span className={`cart-count${count > 0 ? " show" : ""}`}>{count}</span>
            </button>

            <button className="icon-btn burger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="light-rail">
          <div className="rail-track">
            {[...RAIL_ITEMS, ...RAIL_ITEMS].map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>
      </header>

      <div className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        <div className="mobile-nav-head">
          <Link className="wordmark" to="/" onClick={() => setMobileOpen(false)}>
            Éclaire
            <small>Atelier · 925</small>
          </Link>
          <button className="icon-btn" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mobile-nav-links">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")} onClick={() => setMobileOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <p className="mobile-nav-foot">© {new Date().getFullYear()} Éclaire Atelier</p>
      </div>

      <Outlet />

      <footer className="site-footer">
        <div className="container footer-top">
          <div className="footer-brand">
            <span className="wordmark">Éclaire</span>
            <p>Solid 925 sterling silver, hand-finished in the atelier and weighted to last generations.</p>
          </div>
          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/shop">All Pieces</Link>
            <Link to="/shop">New Arrivals</Link>
            <Link to="/cart">Your Bag</Link>
          </div>
          <div className="footer-col">
            <h4>Atelier</h4>
            <Link to="/story">Our Story</Link>
            <Link to="/journal">Journal</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Promise</h4>
            <Link to="/care">Shipping & Care</Link>
            <Link to="/care">Returns</Link>
            <Link to="/contact">Get in Touch</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Éclaire Atelier. All rights reserved.</p>
        </div>
      </footer>

      <CartDrawer />
      <Toast />
    </>
  );
}
