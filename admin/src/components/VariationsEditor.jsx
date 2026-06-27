import { useMemo, useState } from "react";

/**
 * Structured editor for product `metadata`. Controlled component:
 *   value    – the current metadata object
 *   onChange – (nextMetadataObject) => void
 *
 * It produces the exact JSON shape the storefront consumes (see
 * storefront/src/api.js → buildCatalog / displayFields):
 *   collection, metal, weight, swatch, tag (display fields)
 *   lengths[] + default_length, widths[] + default_width (Pattern A variations)
 * Any other keys (Pattern B: base_product/length/width, custom keys) are
 * preserved untouched via the "Additional fields" editor and round-tripping.
 */

/* Keys this editor manages explicitly via dedicated controls. Everything else
   falls through to the "Additional fields" / raw editors and is preserved. */
const DISPLAY_KEYS = ["collection", "metal", "weight", "swatch", "tag"];
const VARIATION_KEYS = ["lengths", "widths", "default_length", "default_width"];
/* Pattern B variant-linkage keys — owned by ProductForm's VariantPricing
   section, not surfaced here (it writes/reads them directly on submit). */
const VARIANT_LINK_KEYS = ["base_product", "base_label", "length", "width"];
const MANAGED_KEYS = new Set([...DISPLAY_KEYS, ...VARIATION_KEYS, ...VARIANT_LINK_KEYS]);

const TAG_SUGGESTIONS = ["Bestseller", "New", "None"];
const DEFAULT_SWATCH = "#C8CCD2";

/* Normalize an unknown value into an array of trimmed strings. */
function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((x) => x.length > 0);
}

/* Build a clean metadata object from a draft, omitting empty optional fields. */
function buildMetadata(draft) {
  const out = {};

  // Preserve any unmanaged keys first (Pattern B + custom).
  for (const [k, v] of Object.entries(draft.extra || {})) {
    if (k.trim()) out[k] = v;
  }

  // Display fields — omit when empty.
  for (const k of DISPLAY_KEYS) {
    const val = (draft[k] ?? "").trim();
    if (!val) continue;
    if (k === "tag" && val.toLowerCase() === "none") continue;
    out[k] = val;
  }

  // Variations — omit array + its default when the array is empty.
  const lengths = asStringArray(draft.lengths);
  if (lengths.length) {
    out.lengths = lengths;
    if (draft.default_length && lengths.includes(draft.default_length)) {
      out.default_length = draft.default_length;
    }
  }
  const widths = asStringArray(draft.widths);
  if (widths.length) {
    out.widths = widths;
    if (draft.default_width && widths.includes(draft.default_width)) {
      out.default_width = draft.default_width;
    }
  }

  return out;
}

/* Split an incoming metadata object into the draft shape the UI edits. */
function toDraft(meta) {
  const m = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
  const extra = {};
  for (const [k, v] of Object.entries(m)) {
    if (!MANAGED_KEYS.has(k)) extra[k] = v;
  }
  return {
    collection: typeof m.collection === "string" ? m.collection : "",
    metal: typeof m.metal === "string" ? m.metal : "",
    weight: typeof m.weight === "string" ? m.weight : "",
    swatch: typeof m.swatch === "string" ? m.swatch : "",
    tag: typeof m.tag === "string" ? m.tag : "",
    lengths: asStringArray(m.lengths),
    widths: asStringArray(m.widths),
    default_length: typeof m.default_length === "string" ? m.default_length : "",
    default_width: typeof m.default_width === "string" ? m.default_width : "",
    extra,
  };
}

/* Valid 3/6-digit hex colour (with leading #). */
function isHex(s) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}

export default function VariationsEditor({ value, onChange }) {
  const draft = useMemo(() => toDraft(value), [value]);

  const [lenInput, setLenInput] = useState("");
  const [widInput, setWidInput] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rawDirty, setRawDirty] = useState(false);
  const [rawError, setRawError] = useState("");

  /* Emit a new metadata object built from a mutated draft. */
  function emit(nextDraft) {
    onChange(buildMetadata(nextDraft));
  }

  function setField(key, val) {
    emit({ ...draft, [key]: val });
  }

  /* ---- option (length / width) helpers ---- */
  function addOption(arrKey, defKey, rawVal, clearInput) {
    const v = rawVal.trim();
    if (!v) return;
    const arr = draft[arrKey];
    if (arr.includes(v)) {
      clearInput("");
      return;
    }
    const next = { ...draft, [arrKey]: [...arr, v] };
    if (!next[defKey]) next[defKey] = v; // first added becomes default
    emit(next);
    clearInput("");
  }

  function removeOption(arrKey, defKey, val) {
    const arr = draft[arrKey].filter((x) => x !== val);
    const next = { ...draft, [arrKey]: arr };
    if (draft[defKey] === val) next[defKey] = arr[0] || ""; // auto-pick / clear
    emit(next);
  }

  function setDefault(defKey, val) {
    emit({ ...draft, [defKey]: val });
  }

  /* ---- additional (extra) key/value helpers ---- */
  function setExtraKey(oldKey, newKey) {
    const entries = Object.entries(draft.extra);
    const next = {};
    for (const [k, v] of entries) next[k === oldKey ? newKey : k] = v;
    emit({ ...draft, extra: next });
  }
  function setExtraValue(key, val) {
    emit({ ...draft, extra: { ...draft.extra, [key]: val } });
  }
  function removeExtra(key) {
    const next = { ...draft.extra };
    delete next[key];
    emit({ ...draft, extra: next });
  }
  function addExtra() {
    let base = "key";
    let k = base;
    let i = 1;
    while (Object.prototype.hasOwnProperty.call(draft.extra, k)) k = `${base}${++i}`;
    emit({ ...draft, extra: { ...draft.extra, [k]: "" } });
  }

  /* ---- raw JSON escape hatch ---- */
  function openRaw() {
    setRawText(JSON.stringify(value ?? {}, null, 2));
    setRawDirty(false);
    setRawError("");
    setShowRaw(true);
  }
  function onRawChange(text) {
    setRawText(text);
    setRawDirty(true);
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Metadata must be a JSON object.");
      }
      setRawError("");
      onChange(parsed);
    } catch (err) {
      setRawError(err.message || "Invalid JSON.");
    }
  }
  // Keep raw textarea in sync with structured edits while it's open & untouched.
  const syncedRaw = showRaw && !rawDirty ? JSON.stringify(value ?? {}, null, 2) : rawText;

  const swatchHex = isHex(draft.swatch) ? draft.swatch : DEFAULT_SWATCH;

  return (
    <div className="ad-veditor">
      {/* ---------------- Details ---------------- */}
      <div className="ad-vsection">
        <span className="ad-vsection-title">Details</span>
        <div className="ad-form-row">
          <label className="ad-field ad-grow">
            <span>Collection</span>
            <input
              value={draft.collection}
              onChange={(e) => setField("collection", e.target.value)}
              placeholder="Signature Silver"
            />
          </label>
          <label className="ad-field ad-grow">
            <span>Metal</span>
            <input
              value={draft.metal}
              onChange={(e) => setField("metal", e.target.value)}
              placeholder="925 Sterling Silver"
            />
          </label>
          <label className="ad-field ad-field-sm">
            <span>Weight</span>
            <input
              value={draft.weight}
              onChange={(e) => setField("weight", e.target.value)}
              placeholder="18.4g"
            />
          </label>
        </div>

        <div className="ad-form-row">
          <label className="ad-field ad-grow">
            <span>Tag</span>
            <input
              value={draft.tag}
              onChange={(e) => setField("tag", e.target.value)}
              placeholder="Bestseller"
            />
            <div className="ad-chip-suggest">
              {TAG_SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className="ad-chip-mini"
                  onClick={() => setField("tag", s === "None" ? "" : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>

          <div className="ad-field ad-field-sm">
            <span>Swatch</span>
            <div className="ad-swatch-row">
              <input
                type="color"
                className="ad-swatch-color"
                value={swatchHex}
                onChange={(e) => setField("swatch", e.target.value.toUpperCase())}
                aria-label="Swatch colour picker"
              />
              <input
                className="ad-swatch-hex ad-mono"
                value={draft.swatch}
                onChange={(e) => setField("swatch", e.target.value)}
                placeholder="#C8CCD2"
                spellCheck={false}
              />
            </div>
            {draft.swatch && !isHex(draft.swatch) && (
              <small className="ad-hint ad-hint-warn">Use a hex colour, e.g. #C8CCD2.</small>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- Variations ---------------- */}
      <div className="ad-vsection">
        <span className="ad-vsection-title">Variations</span>
        <small className="ad-hint">
          Length and width options shown on the storefront. Star marks the default.
        </small>

        <OptionEditor
          label="Length"
          values={draft.lengths}
          defaultValue={draft.default_length}
          input={lenInput}
          setInput={setLenInput}
          onAdd={() => addOption("lengths", "default_length", lenInput, setLenInput)}
          onRemove={(v) => removeOption("lengths", "default_length", v)}
          onSetDefault={(v) => setDefault("default_length", v)}
          placeholder={'20"'}
        />
        <OptionEditor
          label="Width"
          values={draft.widths}
          defaultValue={draft.default_width}
          input={widInput}
          setInput={setWidInput}
          onAdd={() => addOption("widths", "default_width", widInput, setWidInput)}
          onRemove={(v) => removeOption("widths", "default_width", v)}
          onSetDefault={(v) => setDefault("default_width", v)}
          placeholder="3mm"
        />
      </div>

      {/* ---------------- Additional fields ---------------- */}
      <div className="ad-vsection">
        <span className="ad-vsection-title">Additional fields</span>
        <small className="ad-hint">
          Any other metadata keys (e.g. base_product, length, width). Non-string values
          are read-only to avoid data loss — edit them in the raw JSON view.
        </small>
        <div className="ad-kv-list">
          {Object.entries(draft.extra).map(([k, v]) => {
            const isString = typeof v === "string";
            return (
              <div className="ad-kv-row" key={k}>
                <input
                  className="ad-kv-key"
                  value={k}
                  onChange={(e) => setExtraKey(k, e.target.value)}
                  placeholder="key"
                  spellCheck={false}
                />
                {isString ? (
                  <input
                    className="ad-kv-val"
                    value={v}
                    onChange={(e) => setExtraValue(k, e.target.value)}
                    placeholder="value"
                  />
                ) : (
                  <input
                    className="ad-kv-val ad-mono"
                    value={JSON.stringify(v)}
                    readOnly
                    title="Non-string value — edit in raw JSON"
                  />
                )}
                <button
                  type="button"
                  className="ad-btn ad-btn-sm ad-btn-danger"
                  onClick={() => removeExtra(k)}
                  aria-label={`Remove ${k}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className="ad-btn ad-btn-sm" onClick={addExtra}>
          + Add field
        </button>
      </div>

      {/* ---------------- Raw JSON ---------------- */}
      <div className="ad-vsection">
        <button
          type="button"
          className="ad-raw-toggle"
          onClick={() => (showRaw ? setShowRaw(false) : openRaw())}
        >
          {showRaw ? "▾ Hide raw JSON" : "▸ Edit raw JSON"}
        </button>
        {showRaw && (
          <div className="ad-raw-wrap">
            <textarea
              className="ad-mono ad-raw-text"
              rows={8}
              value={syncedRaw}
              onChange={(e) => onRawChange(e.target.value)}
              spellCheck={false}
            />
            {rawError ? (
              <small className="ad-hint ad-hint-warn">{rawError}</small>
            ) : (
              <small className="ad-hint">Valid JSON object — changes apply live.</small>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* A chip editor for one variation axis (length or width). */
function OptionEditor({
  label,
  values,
  defaultValue,
  input,
  setInput,
  onAdd,
  onRemove,
  onSetDefault,
  placeholder,
}) {
  return (
    <div className="ad-opt">
      <span className="ad-opt-label">{label}</span>
      <div className="ad-chips">
        {values.length === 0 && <span className="ad-chips-empty">No {label.toLowerCase()} options</span>}
        {values.map((v) => {
          const isDefault = v === defaultValue;
          return (
            <span className={`ad-chip${isDefault ? " is-default" : ""}`} key={v}>
              <button
                type="button"
                className="ad-chip-star"
                onClick={() => onSetDefault(v)}
                title={isDefault ? "Default" : "Make default"}
                aria-label={isDefault ? `${v} is default` : `Make ${v} default`}
              >
                {isDefault ? "★" : "☆"}
              </button>
              <span className="ad-chip-text">{v}</span>
              <button
                type="button"
                className="ad-chip-x"
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v}`}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <div className="ad-opt-add">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="ad-btn ad-btn-sm" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
