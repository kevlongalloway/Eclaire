import { useMemo } from "react";

/**
 * Per-size price/stock matrix, rendered in ProductForm once at least one
 * length or width option exists on the product. Mirrors the storefront's
 * two-axis variant model (see storefront/src/api.js buildCatalog): when
 * enabled, ProductForm writes one product row per length×width combination
 * (each with its own price/stock) instead of a single shared row.
 */

export function buildCombos(lengths, widths) {
  const ls = lengths || [];
  const ws = widths || [];
  if (ls.length && ws.length) return ls.flatMap((l) => ws.map((w) => ({ length: l, width: w })));
  if (ls.length) return ls.map((l) => ({ length: l, width: undefined }));
  if (ws.length) return ws.map((w) => ({ length: undefined, width: w }));
  return [];
}

export function comboKey(length, width) {
  return `${length || ""}|${width || ""}`;
}

export function comboLabel(combo) {
  return [combo.length, combo.width].filter(Boolean).join(" · ");
}

export default function VariantPricing({ lengths, widths, currency, basePrice, baseStock, value, onChange }) {
  const combos = useMemo(() => buildCombos(lengths, widths), [lengths, widths]);
  const showLength = combos.some((c) => c.length);
  const showWidth = combos.some((c) => c.width);

  function toggle(enabled) {
    if (!enabled) return onChange({ ...value, enabled: false });
    // Seed any combo that doesn't have a row yet from the base price/stock.
    const rows = { ...value.rows };
    for (const combo of combos) {
      const key = comboKey(combo.length, combo.width);
      if (!rows[key]) rows[key] = { price: basePrice, stock: baseStock };
    }
    onChange({ enabled: true, rows });
  }

  function setRow(key, field, val) {
    onChange({ ...value, rows: { ...value.rows, [key]: { ...value.rows[key], [field]: val } } });
  }

  return (
    <div className="ad-veditor">
      <div className="ad-vsection">
        <span className="ad-vsection-title">Pricing</span>

        {combos.length === 0 ? (
          <small className="ad-hint">
            Add at least one length or width option above to price sizes individually.
          </small>
        ) : (
          <>
            <label className="ad-vprice-toggle">
              <input type="checkbox" checked={value.enabled} onChange={(e) => toggle(e.target.checked)} />
              <span>Set a different price &amp; stock for each size</span>
            </label>

            {value.enabled && (
              <div className="ad-vprice-table-wrap">
                <table className="ad-vprice-table">
                  <thead>
                    <tr>
                      {showLength && <th>Length</th>}
                      {showWidth && <th>Width</th>}
                      <th>Price</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((combo) => {
                      const key = comboKey(combo.length, combo.width);
                      const row = value.rows[key] || {};
                      return (
                        <tr key={key}>
                          {showLength && <td>{combo.length || "—"}</td>}
                          {showWidth && <td>{combo.width || "—"}</td>}
                          <td>
                            <div className="ad-input-prefix">
                              <i>$</i>
                              <input
                                value={row.price ?? ""}
                                onChange={(e) => setRow(key, "price", e.target.value)}
                                placeholder={basePrice}
                                inputMode="decimal"
                              />
                            </div>
                          </td>
                          <td>
                            <input
                              value={row.stock ?? ""}
                              onChange={(e) => setRow(key, "stock", e.target.value)}
                              placeholder={baseStock}
                              inputMode="numeric"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <small className="ad-hint">
                  −1 = unlimited stock. Currency follows the price above ({(currency || "usd").toUpperCase()}).
                </small>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
