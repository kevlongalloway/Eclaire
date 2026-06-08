# Éclaire Admin Portal

The internal dashboard for running the store — a React + Vite SPA that talks to
the `/admin/*` routes of the [Éclaire API](../api). It mirrors the storefront's
stack and deploys the same way (a static site), but behind a login.

## Features

- **Overview** — total & 30-day revenue, average order value, units sold,
  unfulfilled count, product counts, discounts given, a 14-day revenue chart,
  and the most recent orders.
- **Products** — searchable list with create / edit / delete, image upload to
  R2, stock & visibility control, and a JSON metadata editor (collection,
  metal, length/width variations, etc.).
- **Orders** — filter by fulfillment status, view line items, totals, and
  shipping address, and update payment/fulfillment status plus carrier,
  service, and tracking number.

## Login

You sign in with a **username and password**. The credentials are configured as
secrets on the API worker in Cloudflare (Workers › Settings › Variables and
Secrets, or via the CLI):

```bash
# on the api/ project:
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD
```

Login (`POST /admin/auth/login`) returns an opaque **session token**, held in
`sessionStorage` (cleared when the tab closes) and sent as
`Authorization: Bearer <token>` on every request — credentials are **never**
baked into the build. Add the portal's deployed origin to the API's
`CORS_ORIGINS`.

**Changing the password:** the `ADMIN_PASSWORD` secret is only the *initial*
password. Use **Change password** in the sidebar to set a new one — it's stored
(hashed) in D1, takes precedence over the secret, and signs out every other
session. While still on the default password, the portal nudges you to change
it.

## Local development

```bash
npm install
cp .env.example .env       # set VITE_API_BASE to your API worker URL
npm run dev                # http://localhost:5174
npm run build              # production build → dist/
npm run preview            # preview the build
```

Run the API locally (see [`../api/README.md`](../api/README.md)) and point
`VITE_API_BASE` at `http://localhost:8787`. Sign in with the `ADMIN_USERNAME`
and `ADMIN_PASSWORD` from the API's `.dev.vars`.

## Deploy

Build a static bundle and host it anywhere, behind your own access controls:

- **Cloudflare Pages / Netlify:** the included [`public/_redirects`](public/_redirects)
  provides the SPA fallback (`/* → /index.html`).
- **Render:** the included [`render.yaml`](render.yaml) declares the static site,
  the `VITE_API_BASE` variable, the SPA rewrite, and a `noindex` header.

Set **`VITE_API_BASE`** to the worker URL at build time, and add the site's
origin to the API worker's `CORS_ORIGINS`.

## Endpoints consumed

See [`../api/README.md`](../api/README.md) for the full reference.

| Area | Endpoints |
|---|---|
| **Auth** | `POST /admin/auth/login`, `GET /admin/auth/check`, `POST /admin/auth/logout`, `POST /admin/auth/password` |
| **Overview** | `GET /admin/stats` |
| **Products** | `GET/POST /admin/products`, `GET/PATCH/DELETE /admin/products/:id` |
| **Images** | `POST /admin/images` |
| **Orders** | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id` |

## Layout

```
admin/
├── index.html
├── public/_redirects        # SPA fallback for static hosts
├── render.yaml              # Render static-site blueprint
└── src/
    ├── main.jsx             # bootstrap (router + auth provider)
    ├── App.jsx              # routes + auth gate
    ├── auth.jsx             # username/password session auth
    ├── api.js               # admin API client + money/date helpers
    ├── styles.css
    ├── components/          # Layout, Login, Modal, ProductForm, ChangePassword
    └── pages/               # Overview, Products, Orders
```
