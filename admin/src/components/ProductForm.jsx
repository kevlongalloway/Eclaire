import { useRef, useState } from "react";
import { api, centsToDollars, dollarsToCents } from "../api";
import Modal from "./Modal.jsx";
import VariationsEditor from "./VariationsEditor.jsx";

/**
 * Create/edit form for a product. `product` null ⇒ create. Calls onSaved(saved)
 * after a successful write so the list can refresh.
 */
export default function ProductForm({ product, onClose, onSaved }) {
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? centsToDollars(product.price) : "");
  const [currency, setCurrency] = useState(product?.currency ?? "usd");
  const [description, setDescription] = useState(product?.description ?? "");
  const [stock, setStock] = useState(product ? String(product.stock) : "-1");
  const [active, setActive] = useState(product ? product.active : true);
  const [images, setImages] = useState(product?.images ?? []);
  const [metadata, setMetadata] = useState(product?.metadata ?? {});

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const cents = dollarsToCents(price);
    if (!name.trim()) return setError("Name is required.");
    if (cents == null || cents < 0) return setError("Enter a valid price.");

    const meta =
      metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

    const payload = {
      name: name.trim(),
      price: cents,
      currency: currency.trim() || "usd",
      description,
      stock: parseInt(stock, 10),
      active,
      images,
      metadata: meta,
    };
    if (Number.isNaN(payload.stock)) payload.stock = -1;

    setSaving(true);
    try {
      const saved = editing
        ? await api.updateProduct(product.id, payload)
        : await api.createProduct(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit product" : "New product"} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="ad-prodform">
        <div className="ad-form-row">
          <label className="ad-field ad-grow">
            <span>Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lumière Curb Chain" />
          </label>
        </div>

        <div className="ad-form-row">
          <label className="ad-field">
            <span>Price *</span>
            <div className="ad-input-prefix">
              <i>$</i>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="148.00" inputMode="decimal" />
            </div>
          </label>
          <label className="ad-field ad-field-sm">
            <span>Currency</span>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="usd" />
          </label>
          <label className="ad-field ad-field-sm">
            <span>Stock</span>
            <input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
            <small className="ad-hint">−1 = unlimited</small>
          </label>
          <label className="ad-field ad-field-sm ad-check">
            <span>Active</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          </label>
        </div>

        <label className="ad-field">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="ad-field">
          <span>Images</span>
          <div className="ad-img-grid">
            {images.map((url) => (
              <div key={url} className="ad-img-thumb">
                <img src={url} alt="" />
                <button type="button" onClick={() => removeImage(url)} aria-label="Remove">✕</button>
              </div>
            ))}
            <button
              type="button"
              className="ad-img-add"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "+ Upload"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} hidden />
        </div>

        <div className="ad-field">
          <span>Attributes &amp; variations</span>
          <VariationsEditor value={metadata} onChange={setMetadata} />
        </div>

        {error && <p className="ad-form-error">{error}</p>}

        <div className="ad-form-actions">
          <button type="button" className="ad-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
