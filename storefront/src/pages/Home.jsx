import React from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
  const { groups, loading, demo, loadError } = useStore();
  const featured = groups.slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="label">Solid 925 · Hand-Finished</span>
          <h1>Jewelry that catches the light.</h1>
          <p className="hero-sub">
            Solid 925 sterling silver, hand-finished in the atelier and weighted to last.
            Brilliance, beautifully made.
          </p>
          <Link className="btn btn-primary btn-hero" to="/shop">Shop the Collection</Link>
        </div>
      </section>

      <main className="container">
        {demo && (
          <p className="demo-banner">
            Demo mode — showing sample products.{loadError ? ` (API error: ${loadError})` : ""} Set VITE_API_BASE to connect the live store.
          </p>
        )}

        <section className="value-props">
          <span className="label">Why Éclaire</span>
          <div className="value-grid">
            <article className="value-item">
              <h3>Made With Intention</h3>
              <p>Solid 925 sterling silver — never plated, never hollow. Weighted to feel like an heirloom from the first wear.</p>
            </article>
            <article className="value-item">
              <h3>Chosen for Brilliance</h3>
              <p>Each piece is hand-finished so it catches the light differently in every room you enter.</p>
            </article>
            <article className="value-item">
              <h3>Beyond the Season</h3>
              <p>Designed to be worn and loved for years — never tied to a passing trend.</p>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="section-head section-head--row">
            <div>
              <span className="label label--dot">The Collection</span>
              <h2>Pieces that hold the light</h2>
            </div>
            <Link className="btn-link" to="/shop">View all</Link>
          </div>
          {loading ? (
            <p className="empty-state">Loading the collection…</p>
          ) : (
            <ul className="product-grid">
              {featured.map((g) => <ProductCard key={g.key} group={g} />)}
            </ul>
          )}
        </section>

        <section className="section story story--teaser">
          <div className="section-head">
            <span className="label label--dot">Our Story</span>
            <h2>Where light becomes something you can carry</h2>
          </div>
          <p>We begin with solid 925 sterling silver of exceptional quality and weight, crafted so it sparkles with genuine brilliance and feels like an heirloom from the very first wear.</p>
          <Link className="btn btn-outline btn-hero" to="/story">Read our story</Link>
        </section>
      </main>
    </>
  );
}
