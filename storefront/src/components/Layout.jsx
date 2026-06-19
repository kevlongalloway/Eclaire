import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../store.jsx";

export default function Layout() {
  const { count } = useStore();
  const { pathname } = useLocation();

  // Reset scroll on navigation so each page opens at the top.
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" to="/">Éclaire</Link>
        <nav className="site-nav">
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/story">Atelier</NavLink>
          <NavLink to="/cart">Bag ({count})</NavLink>
        </nav>
      </header>

      <Outlet />

      <footer className="site-footer">
        <p>Éclaire Atelier — Brilliance, Beautifully Made.</p>
        <nav className="footer-nav">
          <Link to="/shop">Shop</Link>
          <Link to="/story">Atelier</Link>
          <Link to="/cart">Bag</Link>
        </nav>
        <p>© {new Date().getFullYear()} Éclaire Atelier</p>
      </footer>
    </>
  );
}
