# Éclaire API

The commerce backend for Éclaire — a **Cloudflare Workers** API built with
[Hono](https://hono.dev), backed by **D1** (SQLite) for data and **R2** for
product images. It serves both the public **storefront** and the **admin
portal**.

- **Public routes** (no auth): products, product images, discount validation,
  Stripe checkout, and order status/tracking.
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
| `POST` | `/orders/track` | No-account order lookup `{ confirmationNumber, email }` — both must match the same order. Rate-limited per IP (10/min); generic 404 either way so the response never reveals which field was wrong. |
| `POST` | `/webhooks/stripe` | Stripe webhook (verified). Creates the order on `checkout.session.completed` and sends the confirmation email. |

### Admin auth (username + password)

Admins sign in with a username/password; the API issues an opaque **session
token** sent on every other admin request as `Authorization: Bearer <token>`.

- The **username** is the `ADMIN_USERNAME` secret.
- The **password** is bootstrapped from the `ADMIN_PASSWORD` secret. Once changed
  in-app it's stored (PBKDF2-hashed) in D1 and takes precedence — a Worker can't
  rewrite its own secrets at runtime. Changing the password revokes all other
  sessions.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/auth/login` | — | `{ username, password }` → `{ token, username, expiresAt, mustChangePassword }`. |
| `GET`  | `/admin/auth/check` | token | Confirm the session; reports `mustChangePassword`. |
| `POST` | `/admin/auth/logout` | token | Revoke the current session. |
| `POST` | `/admin/auth/password` | token | `{ currentPassword, newPassword }` → set a new password (revokes other sessions). |

### Admin (require `Authorization: Bearer <session-token>`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Overview aggregates: revenue, orders, units, product counts, 14-day series, recent orders. |
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

## Order tracking & confirmation email

Every order gets a short, human-friendly `confirmation_number` (e.g.
`EC-7K2QXM9P`) generated when the Stripe webhook creates it. Customers look up
status with `POST /orders/track` using **both** the confirmation number and
the email used at checkout — neither alone is enough, so there's no account
needed and no realistic way to enumerate other customers' orders. The
storefront's `/track-order` page (linked from the footer, not the main nav)
is the UI for this.

The confirmation email is sent via [Resend](https://resend.com): verify your
sending domain there, create an API key, and set:

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put EMAIL_FROM         # e.g. "Éclaire Atelier <orders@yourdomain.com>"
```

Leave `RESEND_API_KEY` unset to disable sending (a warning is logged instead —
useful for local dev). Templates live in `src/emails/`.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars          # set ADMIN_USERNAME / ADMIN_PASSWORD (+ Stripe keys)

npm run db:migrate:local                # apply migrations to the local D1
npm run db:seed:local                   # optional sample catalog
npm run dev                             # http://localhost:8787
```

Quick check:

```bash
curl http://localhost:8787/products

# Sign in, then use the returned token for admin calls.
TOKEN=$(curl -s -X POST http://localhost:8787/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change-me-please"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -X POST http://localhost:8787/admin/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
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
2. **Set secrets** (never commit these) in the Cloudflare dashboard
   (Workers › Settings › Variables and Secrets) or via the CLI:
   ```bash
   wrangler secret put ADMIN_USERNAME           # admin login username
   wrangler secret put ADMIN_PASSWORD           # initial password (changeable in-app)
   wrangler secret put STRIPE_SECRET_KEY        # optional — enables checkout
   wrangler secret put STRIPE_WEBHOOK_SECRET    # from the Stripe webhook endpoint
   wrangler secret put RESEND_API_KEY           # optional — enables the order confirmation email
   wrangler secret put EMAIL_FROM               # e.g. "Éclaire Atelier <orders@yourdomain.com>"
   ```
3. **Set vars** in `wrangler.toml`: `CORS_ORIGINS` (your storefront + admin
   origins), `PUBLIC_BASE_URL` (this worker's URL — used to build image URLs),
   and `STOREFRONT_BASE_URL` (used to build the tracking link in emails).
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
│   ├── lib/                   # response envelope, ids, db parsers, discounts, stripe, orders, email, rate limiting
│   ├── emails/                # transactional email templates (HTML + text)
│   └── routes/                # products, images, discounts, checkout, orders, webhooks
└── wrangler.toml
```
