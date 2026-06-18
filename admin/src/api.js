/* ============================================================================
   Éclaire admin API client
   ----------------------------------------------------------------------------
   Talks to the /admin/* routes of the Éclaire API worker. Every request is
   authenticated with the admin key entered at login (which must match
   ADMIN_API_KEY configured on the worker in Cloudflare). Responses use the
   { ok, data } / { ok, error } envelope.

   Money is an INTEGER in the smallest currency unit (cents) everywhere.
   ============================================================================ */

const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export const API_CONFIGURED = Boolean(BASE);

let token = null;
let storeId = null;
let onUnauthorized = null;

export function setToken(t) {
  token = t || null;
}
/* The currently selected store. When set, list/stats calls are scoped to it and
   create calls default new records to it. Mirrors setToken. */
export function setStoreId(id) {
  storeId = id || null;
}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, opts = {}) {
  if (!BASE) throw new Error("VITE_API_BASE is not configured.");

  const headers = { ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (storeId) headers["X-Admin-Store"] = storeId;
  if (opts.body != null && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error("Your session has expired. Please sign in again.");
  }

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
  /* Auth — username/password login returns a session token. Uses a direct
     fetch so a 401 (bad credentials) doesn't trip the global logout handler. */
  async login(username, password) {
    const res = await fetch(`${BASE}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      throw new Error(`Unexpected response from server (HTTP ${res.status})`);
    }
    if (!body || body.ok !== true) {
      throw new Error((body && body.error) || "Sign in failed.");
    }
    return body.data; // { token, username, expiresAt, mustChangePassword }
  },

  /* Confirm the current session and report whether the password is still the
     bootstrap default. */
  check: () => request(`/admin/auth/check`),

  logout: () => request(`/admin/auth/logout`, { method: "POST" }),

  changePassword: (currentPassword, newPassword) =>
    request(`/admin/auth/password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /* Stores */
  listStores: () => request(`/admin/stores`),
  getStore: (id) => request(`/admin/stores/${encodeURIComponent(id)}`),
  createStore: (data) => request(`/admin/stores`, { method: "POST", body: JSON.stringify(data) }),
  updateStore: (id, data) =>
    request(`/admin/stores/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStore: (id) =>
    request(`/admin/stores/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Overview */
  getStats: () => request(`/admin/stats${storeQuery()}`),

  /* Products */
  listProducts: ({ q = "", limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q) params.set("q", q);
    if (storeId) params.set("store_id", storeId);
    return request(`/admin/products?${params.toString()}`);
  },
  getProduct: (id) => request(`/admin/products/${encodeURIComponent(id)}`),
  createProduct: (data) =>
    request(`/admin/products`, { method: "POST", body: JSON.stringify(withStore(data)) }),
  updateProduct: (id, data) =>
    request(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (id) =>
    request(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Discounts */
  listDiscounts: () => request(`/admin/discounts${storeQuery()}`),
  getDiscount: (id) => request(`/admin/discounts/${encodeURIComponent(id)}`),
  createDiscount: (data) =>
    request(`/admin/discounts`, { method: "POST", body: JSON.stringify(withStore(data)) }),
  updateDiscount: (id, data) =>
    request(`/admin/discounts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDiscount: (id) =>
    request(`/admin/discounts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* Images */
  uploadImage: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/admin/images`, { method: "POST", body: form });
  },

  /* Orders */
  listOrders: ({ fulfillment_status = "", limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (fulfillment_status) params.set("fulfillment_status", fulfillment_status);
    if (storeId) params.set("store_id", storeId);
    return request(`/admin/orders?${params.toString()}`);
  },
  getOrder: (id) => request(`/admin/orders/${encodeURIComponent(id)}`),
  updateOrder: (id, data) =>
    request(`/admin/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
};

/* --------------------------------- helpers -------------------------------- */

/* "?store_id=<id>" when a store is selected, else "" — for list/stats GETs. */
function storeQuery() {
  return storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
}

/* Inject the selected store_id into a create body when not already present. */
function withStore(data) {
  if (storeId && (data == null || data.store_id == null)) {
    return { ...(data || {}), store_id: storeId };
  }
  return data;
}

export function formatPrice(amount, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((amount || 0) / 100);
}

/* Parse "$148.00" / "148" / "148.5" into integer cents. */
export function dollarsToCents(input) {
  if (input == null || input === "") return null;
  const n = Number(String(input).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export function centsToDollars(cents) {
  return ((cents || 0) / 100).toFixed(2);
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
