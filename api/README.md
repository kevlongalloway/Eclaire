# Éclaire API

The commerce backend for Éclaire — a **Cloudflare Workers** API built with
[Hono](https://hono.dev), backed by **D1** (SQLite) for data and **R2** for
product images. It serves both the public **storefront** and the **admin
portal**.

- **Public routes** (no auth): products, product images, discount validation,
  Stripe checkout, and order status.
- **Admin routes** (`/admin/*`, bearer-token auth): manage products, images,
  discounts, and orders.

Every JSON response uses the envelope the storefront expects:

```jsonc
{ "ok": true,  "data": … }     // success
{ "ok": false, "error": "…" }  // failure
```

Money is always an **integer in the smallest currency unit** (cents).

## Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `GET`  | `/products?limit=&offset=` | List active products (paginated, newest first). |
| `GET`  | `/products/:id` | Fetch one active product. |
| `GET`  | `/images/<key>` | Stream a product image from R2 (immutable, cached). |
| `POST` | `/discounts/validate` | Quote a cart `{ code?, items:[{productId,price,quantity}] }`. Re-prices server-side and stacks automatic sales. |
| `POST` | `/checkout/session` | Create a Stripe Checkout Session `{ items:[{productId,quantity}], successUrl, cancelUrl, discountCode? }` → `{ url, sessionId }`. |
| `GET`  | `/orders?session_id=` | Order created by the Stripe webhook (404 until it fires — the storefront polls). |
| `POST` | `/webhooks/stripe` | Stripe webhook (verified). Creates the order on `checkout.session.completed`. |

### Admin (require `Authorization: Bearer <ADMIN_API_KEY>` or `X-Admin-Key`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/products?q=&limit=&offset=` | List all products (incl. inactive). |
| `POST` | `/admin/products` | Create a product. |
| `GET` / `PATCH` / `DELETE` | `/admin/products/:id` | Read / update / delete a product. |
| `POST` | `/admin/images` | Upload an image (multipart `file`, or raw body) → `{ key, url }`. |
| `DELETE` | `/admin/images/<key>` | Delete an image from R2. |
| `GET` | `/admin/discounts` · `POST` | List / create discount codes & automatic sales. |
| `GET` / `PATCH` / `DELETE` | `/admin/discounts/:id` | Read / update / delete. |
| `GET` | `/admin/orders?fulfillment_status=&limit=&offset=` | List orders. |
| `GET` | `/admin/orders/:id` | Order with line items. |
| `PATCH` | `/admin/orders/:id` | Update `status`, `fulfillment_status`, `shipping_carrier`, `shipping_service`, `tracking_number`. |

## Product model

```jsonc
{
  "id": "curb-chain",
  "name": "Lumière Curb Chain",
  "description": "…",
  "price": 14800,                 // cents
  "currency": "usd",
  "active": true,
  "stock": 25,                    // -1 = unlimited
  "images": ["https://…/images/products/…jpg"],
  "metadata": {                   // free-form; the storefront reads these
    "collection": "Lumière", "metal": "925 Sterling Silver", "weight": "18g",
    "swatch": "#C8CCD2", "tag": "Bestseller",
    // length/width variations — see storefront/README.md (Patterns A & B)
    "lengths": ["18\"","20\""], "widths": ["2mm","3mm"],
    "base_product": "etoile-rope", "length": "20\"", "width": "3mm"
  }
}
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars          # set ADMIN_API_KEY (+ Stripe keys for checkout)

npm run db:migrate:local                # apply migrations to the local D1
npm run db:seed:local                   # optional sample catalog
npm run dev                             # http://localhost:8787
```

Quick check:

```bash
curl http://localhost:8787/products
curl -X POST http://localhost:8787/admin/products \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"New Chain","price":12900,"stock":10}'
```

`npm run typecheck` runs `tsc --noEmit`.

## Deploying to Cloudflare

1. **Create resources** and copy the ids into `wrangler.toml`:
   ```bash
   wrangler d1 create eclaire           # → paste database_id into wrangler.toml
   wrangler r2 bucket create eclaire-media
   wrangler r2 bucket create eclaire-media-preview   # local/preview
   ```
2. **Set secrets** (never commit these):
   ```bash
   wrangler secret put ADMIN_API_KEY
   wrangler secret put STRIPE_SECRET_KEY        # optional — enables checkout
   wrangler secret put STRIPE_WEBHOOK_SECRET    # from the Stripe webhook endpoint
   ```
3. **Set vars** in `wrangler.toml`: `CORS_ORIGINS` (your storefront + admin
   origins) and `PUBLIC_BASE_URL` (this worker's URL — used to build image URLs).
4. **Migrate + deploy**:
   ```bash
   npm run db:migrate
   npm run deploy
   ```
5. **Stripe webhook**: add an endpoint pointing at
   `https://<worker>/webhooks/stripe` for the `checkout.session.completed`
   event, then save its signing secret as `STRIPE_WEBHOOK_SECRET`.

Point the storefront at the deployed worker by setting `VITE_API_BASE`
(see [`../storefront/README.md`](../storefront/README.md)).

## Layout

```
api/
├── migrations/0001_init.sql   # D1 schema
├── seeds/seed.sql             # sample catalog (local dev)
├── src/
│   ├── index.ts               # app: CORS, route mounting, auth, errors
│   ├── types.ts               # Env bindings + shared types
│   ├── middleware/auth.ts     # admin bearer-token guard
│   ├── lib/                   # response envelope, ids, db parsers, discounts, stripe, orders
│   └── routes/                # products, images, discounts, checkout, orders, webhooks
└── wrangler.toml
```
