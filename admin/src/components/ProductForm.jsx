import { useEffect, useRef, useState } from "react";
import { api, centsToDollars, dollarsToCents } from "../api";
import Modal from "./Modal.jsx";
import VariationsEditor from "./VariationsEditor.jsx";
import VariantPricing, { buildCombos, comboKey, comboLabel } from "./VariantPricing.jsx";

/* Strip the per-variant linkage keys (owned by the variant pricing matrix,
   not the generic metadata editor) before they round-trip through state. */
function withoutVariantLinks(meta) {
  const { base_product, base_label, length, width, ...rest } = meta || {};
  return rest;
}

/* Display fields shared across every row of a variant family. */
function sharedVariantMeta(meta) {
  const out = {};
  for (const k of ["collection", "metal", "weight", "swatch", "tag", "default_length", "default_width"]) {
    if (meta[k]) out[k] = meta[k];
  }
  return out;
}

function slugifyName(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sortedUnique(arr) {
  return [...new Set(arr)].sort((a, b) => parseFloat(a) - parseFloat(b));
}

/**
 * Create/edit form for a product. `product` null ⇒ create. Calls onSaved(saved)
 * after a successful write so the list can refresh.
 *
 * Supports per-size pricing (Pattern B): when the admin turns on "different
 * price per size", one product row is written per length×width combination
 * (linked by metadata.base_product) instead of the single shared row.
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

  // Per-size pricing: variantPricing.rows is keyed by comboKey(length, width).
  // variantIds holds the real product id for combos that already exist on the
  // server (only populated when editing an existing variant family).
  const [variantPricing, setVariantPricing] = useState({ enabled: false, rows: {} });
  const [variantIds, setVariantIds] = useState({});

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Editing a row that's already part of a Pattern B family — load every
  // sibling so the whole family can be priced/edited together. Each sibling
  // row only carries its own length/width (no lengths[]/widths[] array), so
  // the chip options shown in VariationsEditor/VariantPricing are rebuilt
  // here from the family, the same way the storefront's buildCatalog does.
  useEffect(() => {
    const baseProduct = product?.metadata?.base_product;
    if (!baseProduct) return;
    let alive = true;
    (async () => {
      try {
        const all = await api.listProducts({ limit: 500 });
        if (!alive) return;
        const siblings = all.filter((p) => p.metadata?.base_product === baseProduct);
        const rows = {};
        const ids = {};
        const lengths = [];
        const widths = [];
        let defaultLength = "";
        let defaultWidth = "";
        const rep = siblings.find((s) => s.metadata?.base_label) || siblings[0];
        if (rep) setName(rep.metadata?.base_label || rep.name.split(" — ")[0]);
        for (const s of siblings) {
          const l = s.metadata?.length;
          const w = s.metadata?.width;
          if (l) lengths.push(l);
          if (w) widths.push(w);
          if (s.metadata?.default_length) defaultLength = s.metadata.default_length;
          if (s.metadata?.default_width) defaultWidth = s.metadata.default_width;
          rows[comboKey(l, w)] = { price: centsToDollars(s.price), stock: String(s.stock) };
          ids[comboKey(l, w)] = s.id;
        }
        setMetadata((prev) => ({
          ...prev,
          lengths: sortedUnique(lengths),
          widths: sortedUnique(widths),
          ...(defaultLength ? { default_length: defaultLength } : {}),
          ...(defaultWidth ? { default_width: defaultWidth } : {}),
        }));
        setVariantPricing({ enabled: true, rows });
        setVariantIds(ids);
      } catch {
        // Best-effort — fall back to editing this row alone.
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftLengths = Array.isArray(metadata?.lengths) ? metadata.lengths : [];
  const draftWidths = Array.isArray(metadata?.widths) ? metadata.widths : [];

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
    const baseStockInt = parseInt(stock, 10);

    const rawMeta =
      metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
    const meta = withoutVariantLinks(rawMeta);
    const combos = buildCombos(
      Array.isArray(meta.lengths) ? meta.lengths : [],
      Array.isArray(meta.widths) ? meta.widths : [],
    );

    if (variantPricing.enabled && combos.length === 0) {
      return setError("Add at least one length or width option to price sizes individually.");
    }

    setSaving(true);
    try {
      const wasFamily = Object.keys(variantIds).length > 0;

      if (!variantPricing.enabled) {
        const payload = {
          name: name.trim(),
          price: cents,
          currency: currency.trim() || "usd",
          description,
          stock: Number.isNaN(baseStockInt) ? -1 : baseStockInt,
          active,
          images,
          metadata: meta,
        };
        const saved = editing
          ? await api.updateProduct(product.id, payload)
          : await api.createProduct(payload);

        // Coming from a family but now priced as one product — drop the
        // now-redundant sibling rows.
        if (wasFamily) {
          const keepId = editing ? product.id : saved.id;
          const staleIds = Object.values(variantIds).filter((id) => id !== keepId);
          await Promise.all(staleIds.map((id) => api.deleteProduct(id).catch(() => {})));
        }
        onSaved(saved);
      } else {
        const baseKey =
          product?.metadata?.base_product || slugifyName(name) || `family-${Date.now().toString(36)}`;
        const shared = sharedVariantMeta(meta);

        const writes = combos.map((combo, i) => {
          const key = comboKey(combo.length, combo.width);
          const row = variantPricing.rows[key] || {};
          const rowCents = dollarsToCents(row.price);
          const rowStock = parseInt(row.stock, 10);
          const label = comboLabel(combo);
          const payload = {
            name: `${name.trim()}${label ? ` — ${label}` : ""}`,
            price: rowCents == null ? cents : rowCents,
            currency: currency.trim() || "usd",
            description,
            stock: Number.isNaN(rowStock) ? (Number.isNaN(baseStockInt) ? -1 : baseStockInt) : rowStock,
            active,
            images,
            metadata: {
              ...shared,
              base_product: baseKey,
              base_label: name.trim(),
              ...(combo.length ? { length: combo.length } : {}),
              ...(combo.width ? { width: combo.width } : {}),
            },
          };
          // Converting a single product into a family for the first time —
          // reuse its id for the first combo instead of orphaning it.
          const existingId = variantIds[key] || (i === 0 && editing && !wasFamily ? product.id : undefined);
          return { key, payload, existingId };
        });

        const results = await Promise.all(
          writes.map(({ payload, existingId }) =>
            existingId ? api.updateProduct(existingId, payload) : api.createProduct(payload),
          ),
        );

        const usedIds = new Set(writes.map((w) => w.existingId).filter(Boolean));
        const previousIds = wasFamily ? Object.values(variantIds) : editing ? [product.id] : [];
        const staleIds = previousIds.filter((id) => !usedIds.has(id));
        await Promise.all(staleIds.map((id) => api.deleteProduct(id).catch(() => {})));

        onSaved(results[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
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

        <div className="ad-field">
          <VariantPricing
            lengths={draftLengths}
            widths={draftWidths}
            currency={currency}
            basePrice={price}
            baseStock={stock}
            value={variantPricing}
            onChange={setVariantPricing}
          />
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
