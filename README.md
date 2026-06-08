# Éclaire

A luxury jewelry commerce platform, organized as a monorepo:

```
.
├── storefront/   # Customer-facing storefront (React + Vite static site)
├── api/          # Commerce API — Cloudflare Workers (Hono) + D1 + R2
└── admin/        # Admin portal (placeholder — frontend to be built)
```

## Components

### `storefront/` — customer storefront
The original React single-page app: catalog, cart, discounts, Stripe checkout,
and order tracking. Deploys as a static site and talks to the API via
`VITE_API_BASE`. See [`storefront/README.md`](storefront/README.md).

### `api/` — commerce API
A Cloudflare Workers API (Hono) backed by **D1** (products, discounts, orders)
and **R2** (product images). It exposes:

- **Public routes** for the storefront — products, images, discount validation,
  Stripe checkout, and order status.
- **Admin routes** (`/admin/*`, bearer-token auth) for the admin portal —
  managing products, images, discounts, and orders.

See [`api/README.md`](api/README.md) for the full endpoint reference and
deployment steps.

### `admin/` — admin portal
A placeholder for the internal dashboard (add products, manage orders, etc.).
The backend it depends on already exists in `api/`. See
[`admin/README.md`](admin/README.md).

## How they connect

```
            VITE_API_BASE                     Bearer ADMIN_API_KEY
storefront ───────────────▶  api (Workers)  ◀───────────────────  admin
                              │   │
                         D1 ◀─┘   └─▶ R2          Stripe ◀─▶ /checkout, /webhooks
                      (products,      (product
                       discounts,      images)
                       orders)
```

## Getting started

Each component is self-contained — see its README:

- Storefront: [`storefront/README.md`](storefront/README.md)
- API: [`api/README.md`](api/README.md)
