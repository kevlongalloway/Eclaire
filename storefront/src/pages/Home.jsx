import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { formatPrice, getPrimaryImage } from "../api.js";

function NewsletterForm() {
  const { showToast } = useStore();
  const [email, setEmail] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    showToast("You're on the list — thank you.");
    setEmail("");
  }

  return (
    <form className="nl-form" onSubmit={handleSubmit}>
      <input
        type="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn btn-primary" type="submit">Sign Up</button>
    </form>
  );
}

export default function Home() {
  const { groups, loading, demo, loadError } = useStore();
  const featured = groups.slice(0, 4);
  const heroPiece = groups[0];
  const heroImg = heroPiece ? getPrimaryImage(heroPiece) : null;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="label label--line">Solid 925 · Hand-Finished</span>
          <h1>Jewelry that catches <em>the light.</em></h1>
          <p className="lede">
            Solid 925 sterling silver, hand-finished in the atelier and weighted to last generations.
            Brilliance, beautifully made.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-hero" to="/shop">Shop the Collection</Link>
            <Link className="btn btn-outline btn-hero" to="/story">Our Story</Link>
          </div>
        </div>

        <div className="hero-visual spark-trigger" style={{ "--swatch": heroPiece?.swatch }}>
          {heroImg ? (
            <img
              src={heroImg}
              alt={heroPiece.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="silver-surface">
              <span className="mark">925</span>
            </div>
          )}
          {heroPiece && (
            <div className="hero-chip">
              <span className="chip-name">{heroPiece.name}</span>
              <span className="chip-div" />
              <span className="chip-price">{formatPrice(heroPiece.price, heroPiece.currency)}</span>
            </div>
          )}
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
              <span className="vnum">01</span>
              <h3>Made With Intention</h3>
              <p>Solid 925 sterling silver — never plated, never hollow. Weighted to feel like an heirloom from the first wear.</p>
            </article>
            <article className="value-item">
              <span className="vnum">02</span>
              <h3>Chosen for Brilliance</h3>
              <p>Each piece is hand-finished so it catches the light differently in every room you enter.</p>
            </article>
            <article className="value-item">
              <span className="vnum">03</span>
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

        <section className="section story-strip">
          <div className="story-visual spark-trigger">
            <div className="silver-surface">
              <span className="mark">É</span>
            </div>
          </div>
          <div className="story-body">
            <span className="label label--dot">Our Story</span>
            <h2>Where light becomes something you can carry</h2>
            <p>We begin with solid 925 sterling silver of exceptional quality and weight, crafted so it sparkles with genuine brilliance and feels like an heirloom from the very first wear.</p>
            <Link className="btn btn-outline btn-hero" to="/story">Read our story</Link>
          </div>
        </section>
      </main>

      <section className="newsletter section">
        <div className="container">
          <span className="label">Stay in the Light</span>
          <h2>Join the Atelier list</h2>
          <p>New collections, early access, and the occasional offer. No spam, ever.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
