import React, { useMemo, useState } from "react";
import { useStore } from "../store.jsx";
import ProductCard from "../components/ProductCard.jsx";

const SORTS = {
  featured: { label: "Featured", cmp: null },
  "price-asc": { label: "Price: Low to High", cmp: (a, b) => a.price - b.price },
  "price-desc": { label: "Price: High to Low", cmp: (a, b) => b.price - a.price },
  name: { label: "Name: A to Z", cmp: (a, b) => a.name.localeCompare(b.name) },
};

export default function Shop() {
  const { groups, loading, demo, loadError } = useStore();
  const [collection, setCollection] = useState("all");
  const [sort, setSort] = useState("featured");

  const collections = useMemo(
    () => ["all", ...new Set(groups.map((g) => g.collection).filter(Boolean))],
    [groups]
  );

  const visible = useMemo(() => {
    let list = collection === "all" ? groups : groups.filter((g) => g.collection === collection);
    const cmp = SORTS[sort].cmp;
    if (cmp) list = [...list].sort(cmp);
    return list;
  }, [groups, collection, sort]);

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
        {!loading && groups.length > 0 && (
          <div className="shop-bar">
            <div className="filters">
              {collections.map((c) => (
                <button
                  key={c}
                  className={`filter${collection === c ? " active" : ""}`}
                  onClick={() => setCollection(c)}
                >
                  {c === "all" ? "All Pieces" : c}
                </button>
              ))}
            </div>
            <div className="sort">
              <label htmlFor="sort-select">Sort</label>
              <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <p className="empty-state">Loading the collection…</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">No pieces match this filter.</p>
        ) : (
          <>
            <p className="shop-count">{visible.length} piece{visible.length === 1 ? "" : "s"}</p>
            <ul className="product-grid">
              {visible.map((g) => <ProductCard key={g.key} group={g} />)}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
