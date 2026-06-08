import { useCallback, useEffect, useState } from "react";
import { api, formatPrice } from "../api";
import ProductForm from "../components/ProductForm.jsx";
import { PageError } from "./Overview.jsx";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // product | "new" | null
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setError("");
    try {
      setProducts(await api.listProducts({ q: query }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  function onSaved() {
    setEditing(null);
    setNotice("Saved.");
    load(q);
    setTimeout(() => setNotice(""), 2500);
  }

  async function onDelete(product) {
    setError("");
    try {
      await api.deleteProduct(product.id);
      setDeleting(null);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setNotice("Product deleted.");
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    }
  }

  if (error && !products.length) return <PageError title="Products" message={error} />;

  return (
    <div className="ad-page">
      <header className="ad-page-head ad-page-head-row">
        <div>
          <h1>Products</h1>
          <p className="ad-page-sub">{products.length} product{products.length === 1 ? "" : "s"}</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={() => setEditing("new")}>+ New product</button>
      </header>

      <div className="ad-toolbar">
        <input
          className="ad-search"
          placeholder="Search by name or id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {notice && <span className="ad-notice">{notice}</span>}
      </div>

      {error && <p className="ad-form-error">{error}</p>}

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="ad-td-center">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="ad-td-center ad-empty">No products. Create your first one.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="ad-thumb-sm">
                      {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span>—</span>}
                    </div>
                  </td>
                  <td>
                    <div className="ad-cell-title">{p.name}</div>
                    <div className="ad-cell-id">{p.id}</div>
                  </td>
                  <td>{formatPrice(p.price, p.currency)}</td>
                  <td>{p.stock === -1 ? "∞" : p.stock}</td>
                  <td>
                    <span className={`ad-badge ${p.active ? "ad-badge-active" : "ad-badge-inactive"}`}>
                      {p.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="ad-row-actions">
                    <button className="ad-btn ad-btn-sm" onClick={() => setEditing(p)}>Edit</button>
                    <button className="ad-btn ad-btn-sm ad-btn-danger" onClick={() => setDeleting(p)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {deleting && (
        <ConfirmDelete
          product={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
        />
      )}
    </div>
  );
}

function ConfirmDelete({ product, onCancel, onConfirm }) {
  return (
    <div className="ad-modal-backdrop" onMouseDown={onCancel}>
      <div className="ad-modal ad-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Delete product?</h2>
        <p>
          <strong>{product.name}</strong> will be permanently removed. This can't be undone.
        </p>
        <div className="ad-form-actions">
          <button className="ad-btn" onClick={onCancel}>Cancel</button>
          <button className="ad-btn ad-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
