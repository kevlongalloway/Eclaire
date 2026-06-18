import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store-context.jsx";
import { PageError } from "./Overview.jsx";

export default function Stores() {
  const { stores, currentStoreId, selectStore, reloadStores, loading } = useStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // store | "new" | null
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  async function onSaved() {
    setEditing(null);
    await reloadStores();
    flash("Saved.");
  }

  async function onDelete(store) {
    setError("");
    try {
      await api.deleteStore(store.id);
      setDeleting(null);
      if (currentStoreId === store.id) selectStore(null);
      await reloadStores();
      flash("Store deleted.");
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    }
  }

  function openStore(store) {
    selectStore(store.id);
    navigate("/");
  }

  if (error && !stores.length) return <PageError title="Stores" message={error} />;

  return (
    <div className="ad-page">
      <header className="ad-page-head ad-page-head-row">
        <div>
          <h1>Stores</h1>
          <p className="ad-page-sub">{stores.length} store{stores.length === 1 ? "" : "s"}</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={() => setEditing("new")}>+ New store</button>
      </header>

      <div className="ad-toolbar">{notice && <span className="ad-notice">{notice}</span>}</div>
      {error && <p className="ad-form-error">{error}</p>}

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Currency</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="ad-td-center">Loading…</td></tr>
            ) : stores.length === 0 ? (
              <tr><td colSpan={5} className="ad-td-center ad-empty">No stores yet. Create your first one.</td></tr>
            ) : (
              stores.map((s) => (
                <tr key={s.id} className={currentStoreId === s.id ? "ms-row-current" : ""}>
                  <td>
                    <div className="ad-cell-title">
                      {s.name}
                      {currentStoreId === s.id && <span className="ms-current-pill">Current</span>}
                    </div>
                    <div className="ad-cell-id">{s.id}</div>
                  </td>
                  <td><code className="ms-slug">{s.slug}</code></td>
                  <td>{(s.currency || "usd").toUpperCase()}</td>
                  <td>
                    <span className={`ad-badge ${s.active ? "ad-badge-active" : "ad-badge-inactive"}`}>
                      {s.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="ad-row-actions">
                    <button className="ad-btn ad-btn-sm ad-btn-primary" onClick={() => openStore(s)}>Open store →</button>
                    <button className="ad-btn ad-btn-sm" onClick={() => setEditing(s)}>Edit</button>
                    <button className="ad-btn ad-btn-sm ad-btn-danger" onClick={() => setDeleting(s)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <StoreForm
          store={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {deleting && (
        <ConfirmDelete
          store={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
        />
      )}
    </div>
  );
}

function StoreForm({ store, onClose, onSaved }) {
  const isNew = !store;
  const [name, setName] = useState(store?.name || "");
  const [slug, setSlug] = useState(store?.slug || "");
  const [currency, setCurrency] = useState(store?.currency || "usd");
  const [active, setActive] = useState(store ? store.active : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        currency: currency.trim() || "usd",
        active,
      };
      if (isNew) await api.createStore(data);
      else await api.updateStore(store.id, data);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ad-modal-backdrop" onMouseDown={onClose}>
      <div className="ad-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{isNew ? "New store" : "Edit store"}</h2>
        <form className="ad-order-form" onSubmit={onSubmit}>
          <label className="ad-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Éclaire London" autoFocus />
          </label>
          <label className="ad-field">
            <span>Slug {isNew && <em className="ms-hint">— optional, derived from name if blank</em>}</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="eclaire-london" />
          </label>
          <div className="ad-form-row">
            <label className="ad-field ad-field-sm">
              <span>Currency</span>
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="usd" />
            </label>
            <label className="ad-field ms-check">
              <span>Active</span>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            </label>
          </div>

          {error && <p className="ad-form-error">{error}</p>}
          <div className="ad-form-actions">
            <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create store" : "Save store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDelete({ store, onCancel, onConfirm }) {
  return (
    <div className="ad-modal-backdrop" onMouseDown={onCancel}>
      <div className="ad-modal ad-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Delete store?</h2>
        <p>
          <strong>{store.name}</strong> will be removed. Stores with products or orders can't be
          deleted.
        </p>
        <div className="ad-form-actions">
          <button className="ad-btn" onClick={onCancel}>Cancel</button>
          <button className="ad-btn ad-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
