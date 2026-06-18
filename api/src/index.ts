import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./types";
import { fail } from "./lib/response";
import { requireAdmin } from "./middleware/auth";
import { authPublic, authProtected } from "./routes/auth";
import { publicProducts, adminProducts } from "./routes/products";
import { publicImages, adminImages } from "./routes/images";
import { publicDiscounts, adminDiscounts } from "./routes/discounts";
import { publicOrders, adminOrders } from "./routes/orders";
import { adminStats } from "./routes/stats";
import { adminStores } from "./routes/stores";
import { checkout } from "./routes/checkout";
import { webhooks } from "./routes/webhooks";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/* ----------------------------------- CORS ---------------------------------- */
// Origins come from the CORS_ORIGINS var ("*" or a comma-separated allowlist).
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const raw = (c.env.CORS_ORIGINS || "*").trim();
      if (raw === "*") return origin || "*";
      const allowed = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
      return origin && allowed.includes(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    // X-Store-Slug: storefront declares its store. X-Admin-Store: admin's selected store.
    allowHeaders: ["Content-Type", "Authorization", "X-Store-Slug", "X-Admin-Store"],
    maxAge: 86400,
  }),
);

/* --------------------------------- health ---------------------------------- */
app.get("/", (c) => c.json({ ok: true, data: { service: "eclaire-api", status: "ok" } }));
app.get("/health", (c) => c.json({ ok: true, data: { status: "ok" } }));

/* ------------------------------ public routes ------------------------------ */
app.route("/products", publicProducts);
app.route("/images", publicImages);
app.route("/discounts", publicDiscounts);
app.route("/orders", publicOrders);
app.route("/checkout", checkout);
app.route("/webhooks", webhooks);

/* --------------------------------- admin ----------------------------------- */
const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Public: username/password login (issues a session token).
admin.route("/auth", authPublic);

// Everything below requires a valid session token.
admin.use("*", requireAdmin);
admin.route("/auth", authProtected); // /auth/check, /auth/logout, /auth/password
admin.route("/stats", adminStats);
admin.route("/stores", adminStores);
admin.route("/products", adminProducts);
admin.route("/images", adminImages);
admin.route("/discounts", adminDiscounts);
admin.route("/orders", adminOrders);
app.route("/admin", admin);

/* --------------------------- fallbacks + errors ---------------------------- */
app.notFound((c) => fail(c, "Not found.", 404));
app.onError((err, c) => {
  console.error(err);
  return fail(c, "Internal server error.", 500);
});

export default app;
