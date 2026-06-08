import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { fail } from "./lib/response";
import { requireAdmin } from "./middleware/auth";
import { publicProducts, adminProducts } from "./routes/products";
import { publicImages, adminImages } from "./routes/images";
import { publicDiscounts, adminDiscounts } from "./routes/discounts";
import { publicOrders, adminOrders } from "./routes/orders";
import { adminStats } from "./routes/stats";
import { checkout } from "./routes/checkout";
import { webhooks } from "./routes/webhooks";

const app = new Hono<{ Bindings: Env }>();

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
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
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

/* ------------------------- admin routes (protected) ------------------------ */
const admin = new Hono<{ Bindings: Env }>();
admin.use("*", requireAdmin);
// Login verification: returns 200 only when the admin key is valid.
admin.get("/auth/check", (c) => c.json({ ok: true, data: { authenticated: true } }));
admin.route("/stats", adminStats);
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
