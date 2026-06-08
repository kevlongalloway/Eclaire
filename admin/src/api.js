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
let onUnauthorized = null;

export function setToken(t) {
  token = t || null;
}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, opts = {}) {
  if (!BASE) throw new Error("VITE_API_BASE is not configured.");

  const headers = { ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
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

  /* Overview */
  getStats: () => request(`/admin/stats`),

  /* Products */
  listProducts: ({ q = "", limit = 100, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q) params.set("q", q);
    return request(`/admin/products?${params.toString()}`);
  },
  getProduct: (id) => request(`/admin/products/${encodeURIComponent(id)}`),
  createProduct: (data) => request(`/admin/products`, { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    request(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (id) =>
    request(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }),

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
    return request(`/admin/orders?${params.toString()}`);
  },
  getOrder: (id) => request(`/admin/orders/${encodeURIComponent(id)}`),
  updateOrder: (id, data) =>
    request(`/admin/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
};

/* --------------------------------- helpers -------------------------------- */

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
