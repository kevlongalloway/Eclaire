/* ============================================================================
   E-commaxxing API client
   ----------------------------------------------------------------------------
   Thin wrapper around the backend documented in the frontend reference.
   Configure the worker URL with VITE_API_BASE (see .env.example). When it is
   not set the app falls back to local mock data (demo mode) so the static
   site still renders — but checkout/discounts are disabled in that mode.

   Money: every `price`/amount is an INTEGER in the smallest currency unit
   (cents). Never divide before sending; only divide for display.
   ============================================================================ */

const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export const API_CONFIGURED = Boolean(BASE);

/* Core request helper — unwraps the { ok, data } envelope and throws on error. */
async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body != null) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  let body = null;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Unexpected response from server (HTTP ${res.status})`);
  }
  if (!body || body.ok !== true) {
    throw new Error((body && body.error) || `Request failed (HTTP ${res.status})`);
  }
  return body.data;
}

export const api = {
  /* GET /products — paginates through the full catalog. */
  async listAllProducts() {
    const limit = 100;
    let offset = 0;
    let all = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await request(`/products?limit=${limit}&offset=${offset}`);
      if (!Array.isArray(page) || page.length === 0) break;
      all = all.concat(page);
      offset += page.length;
      if (page.length < limit) break;
    }
    return all;
  },

  /* GET /products/:id */
  getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),

  /* POST /discounts/validate — pass items as [{ productId, price, quantity }]. */
  validateDiscount: (code, items) =>
    request(`/discounts/validate`, {
      method: "POST",
      body: JSON.stringify({ code: code || undefined, items }),
    }),

  /* POST /checkout/session — returns { url, sessionId }. */
  createCheckoutSession: ({ items, successUrl, cancelUrl, discountCode }) =>
    request(`/checkout/session`, {
      method: "POST",
      body: JSON.stringify({
        items,
        successUrl,
        cancelUrl,
        discountCode: discountCode || undefined,
      }),
    }),

  /* GET /orders?session_id= — returns the order, or null while the webhook
     is still processing (the API answers 404 until the order exists). */
  async getOrderBySession(sessionId) {
    const res = await fetch(`${BASE}/orders?session_id=${encodeURIComponent(sessionId)}`);
    let body = null;
    try {
      body = await res.json();
    } catch {
      throw new Error(`Unexpected response from server (HTTP ${res.status})`);
    }
    if (res.status === 404) return null; // webhook not fired yet — caller retries
    if (!body || body.ok !== true) {
      throw new Error((body && body.error) || `Request failed (HTTP ${res.status})`);
    }
    return body.data;
  },
};

/* Poll for an order created by the Stripe webhook (success page). */
export async function pollForOrder(sessionId, attempts = 6, delayMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    const order = await api.getOrderBySession(sessionId);
    if (order) return order;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Order not found yet. It may still be processing — refresh in a moment.");
}

/* --------------------------------- helpers -------------------------------- */

/* Format an integer (smallest currency unit) for display. */
export function formatPrice(amount, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((amount || 0) / 100);
}

export function getPrimaryImage(product) {
  return product && Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : null;
}

export function isAvailable(product) {
  return !!product && product.active !== false && (product.stock === -1 || product.stock > 0);
}

/* "Sold out" / "Only N left" / null. */
export function stockBadge(stock) {
  if (stock === 0) return "Sold out";
  if (stock > 0 && stock <= 4) return `Only ${stock} left`;
  return null;
}

export function trackingUrl(carrier, trackingNumber) {
  const carriers = {
    USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    FedEx: `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
    DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  return carriers[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
}

/* ============================================================================
   Catalog builder — turns the flat product list into "product groups" (cards),
   resolving length + width variations against whichever pattern the backend
   catalog uses.

   Two-axis variations (length in inches × width in mm) are NOT a first-class
   API concept, so we support both documented patterns:

   • Pattern B (recommended — exact per-variant stock, captured on the order):
       one product per length×width combination, tied together by
       metadata.base_product, each carrying metadata.length and metadata.width.
       The selected combination resolves to that variant's real productId.

   • Pattern A (simple — single product, dimensions are display-only):
       one product carrying metadata.lengths[] and metadata.widths[]. Every
       combination shares one productId/price/stock; the chosen dimensions are
       passed through the success URL for the confirmation page only.

   Either way, a "group" exposes a uniform shape to the UI.
   ============================================================================ */

const DEFAULT_LENGTHS = ['18"', '20"', '22"'];
const DEFAULT_WIDTHS = ["2mm", "3mm", "4mm", "5mm"];
const LENGTH_ORDER = ['16"', '18"', '20"', '22"', '24"'];

const meta = (p, k, fallback) =>
  p && p.metadata && p.metadata[k] != null ? p.metadata[k] : fallback;

function variantKey(length, width) {
  return `${length ?? ""}|${width ?? ""}`;
}

function sortLengths(arr) {
  return [...arr].sort((a, b) => {
    const ia = LENGTH_ORDER.indexOf(a);
    const ib = LENGTH_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    return parseFloat(a) - parseFloat(b);
  });
}
function sortWidths(arr) {
  return [...arr].sort((a, b) => parseFloat(a) - parseFloat(b));
}

/* Common display fields pulled from a representative product. */
function displayFields(p) {
  return {
    collection: meta(p, "collection", "Éclaire"),
    metal: meta(p, "metal", ""),
    weight: meta(p, "weight", ""),
    swatch: meta(p, "swatch", "#C8CCD2"),
    tag: meta(p, "tag", null),
    desc: p.description || "",
    images: Array.isArray(p.images) ? p.images : [],
    currency: p.currency || "usd",
  };
}

export function buildCatalog(products) {
  const standalone = [];
  const byBase = new Map();

  for (const p of products) {
    const base = meta(p, "base_product", null);
    if (base) {
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(p);
    } else {
      standalone.push(p);
    }
  }

  const groups = [];

  /* Pattern B groups */
  for (const [base, variants] of byBase.entries()) {
    const rep = variants[0];
    const df = displayFields(rep);

    const lengths = sortLengths([
      ...new Set(variants.map((v) => meta(v, "length", null)).filter(Boolean)),
    ]);
    const widths = sortWidths([
      ...new Set(variants.map((v) => meta(v, "width", null)).filter(Boolean)),
    ]);

    const byCombo = new Map();
    for (const v of variants) byCombo.set(variantKey(meta(v, "length"), meta(v, "width")), v);

    groups.push({
      key: base,
      name: meta(rep, "base_label", (rep.name || "").split(" — ")[0] || rep.name),
      price: rep.price,
      ...df,
      pattern: "B",
      lengths: lengths.length ? lengths : DEFAULT_LENGTHS,
      widths: widths.length ? widths : DEFAULT_WIDTHS,
      defaultLength: meta(rep, "default_length", null) || lengths[0] || DEFAULT_LENGTHS[1],
      defaultWidth: meta(rep, "default_width", null) || widths[0] || DEFAULT_WIDTHS[1],
      /* Resolve a (length,width) selection to a concrete, purchasable variant. */
      resolve(length, width) {
        const v =
          byCombo.get(variantKey(length, width)) ||
          // single-axis catalogs: match on whichever axis exists
          variants.find((x) => meta(x, "length") === length) ||
          variants.find((x) => meta(x, "width") === width);
        if (!v) return null;
        return { productId: v.id, price: v.price, stock: v.stock, available: isAvailable(v) };
      },
    });
  }

  /* Pattern A standalone products */
  for (const p of standalone) {
    const df = displayFields(p);
    const lengths = Array.isArray(meta(p, "lengths", null)) ? meta(p, "lengths") : DEFAULT_LENGTHS;
    const widths = Array.isArray(meta(p, "widths", null)) ? meta(p, "widths") : DEFAULT_WIDTHS;

    groups.push({
      key: p.id,
      name: p.name,
      price: p.price,
      ...df,
      pattern: "A",
      lengths,
      widths,
      defaultLength: meta(p, "default_length", null) || lengths[1] || lengths[0],
      defaultWidth: meta(p, "default_width", null) || widths[1] || widths[0],
      /* One product for every combination — dimensions are display-only. */
      resolve() {
        return { productId: p.id, price: p.price, stock: p.stock, available: isAvailable(p) };
      },
    });
  }

  return groups;
}
