# Éclaire Admin Portal

> **Placeholder** — the admin frontend will be built here. The backend it talks
> to (the Éclaire API) is already implemented in [`../api`](../api).

This is where the internal admin dashboard for managing the store will live —
adding/editing products, uploading product images, creating discount codes and
sales, and viewing/fulfilling orders (setting carrier + tracking number).

## What it consumes

The admin portal is a pure client of the API's `/admin/*` routes, authenticated
with a shared secret sent on every request:

```
Authorization: Bearer <ADMIN_API_KEY>
```

Capabilities available from the API today (see [`../api/README.md`](../api/README.md)
for the full reference):

| Area | Endpoints |
|---|---|
| **Products** | `GET/POST /admin/products`, `GET/PATCH/DELETE /admin/products/:id` |
| **Images** | `POST /admin/images` (upload → `{ key, url }`), `DELETE /admin/images/<key>` |
| **Discounts** | `GET/POST /admin/discounts`, `GET/PATCH/DELETE /admin/discounts/:id` |
| **Orders** | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id` (fulfillment + tracking) |

## Suggested setup (when building the frontend)

- Configure two values: `VITE_API_BASE` (the worker URL) and the admin key
  (entered at login / stored client-side — never bake the key into the bundle).
- Deploy as a static site (the same way the storefront deploys), but behind
  authentication, and add its origin to the API's `CORS_ORIGINS`.
