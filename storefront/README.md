# Éclaire

A luxury jewelry storefront — a multi-page React app (react-router) wired to the
**E-commaxxing API** (products, discount codes, Stripe checkout, order
tracking). Built with Vite and deployable as a **static site on Render**.

Pages each have their own URL: `/#/` (home), `/#/shop`, `/#/product/:key`,
`/#/cart`, `/#/story`, and `/#/order` (Stripe success page). Routing uses
`HashRouter`, so deep links and refreshes work on any static host without
needing a server-side rewrite rule.

With no API URL configured it runs in **demo mode** on a bundled mock catalog
so the site always renders.

## Local development

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE to your worker URL
npm run dev               # start dev server (http://localhost:5173)
npm run build             # production build → dist/
npm run preview           # preview the production build locally
```

## Connecting the backend

Set a single environment variable to point at your API worker:

```
VITE_API_BASE=https://your-worker.workers.dev
```

- **Local:** put it in `.env` (gitignored).
- **Render:** add it as an environment variable on the static site (it's read
  at **build time**, so a redeploy is required after changing it). It's also
  declared in the root [`render.yaml`](../render.yaml) blueprint with `sync: false`
  so Render prompts you for the value on first deploy.

When `VITE_API_BASE` is unset (or the API is unreachable), the app falls back
to demo mode: products render from mock data, but checkout and discount codes
are disabled.

### Multi-store: `VITE_STORE_SLUG`

The API is multi-store. Set `VITE_STORE_SLUG` to the slug of the store this
storefront represents (create the store in the admin **Stores** page). It is
sent to the API as the `X-Store-Slug` header so products, discounts, and
checkout are scoped to that store:

```
VITE_STORE_SLUG=default
```

Leave it blank to use the API's default store. Like `VITE_API_BASE`, it is read
at **build time**, so redeploy after changing it.

### What's wired up

| Feature | Endpoint | Where |
|---|---|---|
| Catalog (paginated) | `GET /products` | `src/api.js` → `listAllProducts` |
| Prices | — | shown via `formatPrice` (cents → currency) |
| Discount codes + automatic sales | `POST /discounts/validate` | cart drawer |
| Checkout (Stripe hosted) | `POST /checkout/session` | "Checkout" button → redirect |
| Order status + tracking | `GET /orders?session_id=` | success page (`?session_id=…`) |

The success page is the `/order` route: after Stripe redirects back to
`…/order?session_id={CHECKOUT_SESSION_ID}`, the app polls `GET /orders` and shows
status, items, totals, shipping address, and a carrier tracking link.

## Length (inches) + width (mm) variations — backend compatibility

Each chain is offered in several **lengths** and **widths**. The checkout API's
`items` array only accepts `{ productId, quantity }` — there is **no per-line
field for length/width** — so how those dimensions reach the order depends on
how the catalog is modelled. The frontend (`src/api.js` → `buildCatalog`)
supports **both** documented patterns and picks per product based on metadata:

- **Pattern B — recommended (one product per length×width combo).**
  Link variants with `metadata.base_product` and tag each with
  `metadata.length` and `metadata.width`. The selected combination resolves to
  that variant's real `productId`, so per-combination **stock is enforced** and
  the dimensions are **captured in `product_name` on the order** — including in
  mixed-size carts. Optional: `metadata.default_length` / `default_width`.

- **Pattern A — simple (one product, dimensions are display-only).**
  Put the options in `metadata.lengths` (e.g. `["18\"","20\"","22\""]`) and
  `metadata.widths` (e.g. `["2mm","3mm","4mm","5mm"]`). Every combination shares
  one `productId`/price/stock. The chosen dimensions are saved client-side and
  shown on the confirmation page, but are **not** recorded per line on the order
  (so a mixed-size cart can't be disambiguated on the order record).

**Verdict:** the API is compatible with length/width variations — fully, and
including stock + order capture, **only under Pattern B**. Under Pattern A the
dimensions are cosmetic. Use Pattern B if you need per-size inventory or the
dimensions printed on the order/packing slip.

Other product display fields (collection, metal, weight, swatch colour, tag)
are read from `metadata` with sensible fallbacks — see `displayFields` in
`src/api.js`.

## Deploy to Render (static site)

This is a monorepo, so deployment is driven by the **root** [`render.yaml`](../render.yaml)
blueprint (which deploys both this storefront and the admin portal), or set it
up manually:

**Option A — Blueprint (recommended)**

1. Push the repo to GitHub/GitLab.
2. In the Render dashboard: **New → Blueprint**, point it at this repo. Render
   reads the root `render.yaml` and provisions both static sites.
3. Set `VITE_API_BASE` (your Cloudflare Worker URL) for each service.

**Option B — Manual static site**

1. **New → Static Site**, connect this repo.
2. **Root Directory:** `storefront`
3. **Build Command:** `npm install && npm run build` · **Publish Directory:** `dist`
4. Add environment variable `VITE_API_BASE`.
5. Add a rewrite rule **Source** `/*` → **Destination** `/index.html`.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the full end-to-end guide.

## Project structure

```
index.html        # Vite entry HTML
src/main.jsx       # React bootstrap
src/App.jsx        # storefront UI + styles
src/api.js         # API client, money/format helpers, catalog/variant builder
.env.example       # VITE_API_BASE template
vite.config.js
```

> The Render blueprint lives at the repo root ([`../render.yaml`](../render.yaml)).

## Notes

CORS: the API must allow this site's origin (`CORS_ORIGINS` in the worker's
`wrangler.toml`). The newsletter signup has no documented endpoint, so it
remains a local-only stub.
