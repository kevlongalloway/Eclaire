import React from "react";
import { useStore } from "../store.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Shop() {
  const { groups, loading, demo, loadError } = useStore();

  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">The Collection</span>
        <h1>Shop Éclaire</h1>
        <p className="lede">Solid 925 sterling silver, hand-finished to catch the light. Choose your length and width on each piece.</p>
      </section>

      {demo && (
        <p className="demo-banner">
          Demo mode — showing sample products.{loadError ? ` (API error: ${loadError})` : ""} Set VITE_API_BASE to connect the live store.
        </p>
      )}

      <section className="section section--flush">
        {loading ? (
          <p className="empty-state">Loading the collection…</p>
        ) : groups.length === 0 ? (
          <p className="empty-state">No pieces yet.</p>
        ) : (
          <ul className="product-grid">
            {groups.map((g) => <ProductCard key={g.key} group={g} />)}
          </ul>
        )}
      </section>
    </main>
  );
}
