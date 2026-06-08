# Deployment guide

How to deploy all three services:

| Service | Host | Lives in |
|---|---|---|
| **API** (backend) | Cloudflare Workers + D1 + R2 | [`api/`](api/) |
| **Storefront** (frontend) | Render static site | [`storefront/`](storefront/) |
| **Admin portal** (frontend) | Render static site | [`admin/`](admin/) |

**Deploy in this order** — the frontends need the API's URL, and the API needs
the frontends' URLs for CORS:

1. Deploy the **API** to Cloudflare → get the worker URL.
2. (Optional) Configure **Stripe** for checkout.
3. Deploy the **storefront** and **admin** to Render with `VITE_API_BASE` = the worker URL → get their URLs.
4. Set the API's `CORS_ORIGINS` to the two Render URLs and redeploy.
5. Log into the admin portal and change the password.

---

## Prerequisites

- A **Cloudflare** account (free tier is fine for D1 + R2 + Workers).
- A **Render** account, with this repo pushed to **GitHub/GitLab**.
- **Node.js 18+** and the Cloudflare CLI locally:
  ```bash
  npm install -g wrangler   # or use `npx wrangler ...`
  wrangler login
  ```
- (Optional) A **Stripe** account for live checkout.

---

## 1. API → Cloudflare Worker

All commands run from the `api/` directory:

```bash
cd api
npm install
```

### 1a. Create the D1 database

```bash
wrangler d1 create eclaire
```

Copy the `database_id` it prints into **`api/wrangler.toml`**, replacing both
occurrences of `REPLACE_WITH_YOUR_D1_DATABASE_ID` (the top-level block and the
`[env.production]` block).

### 1b. Create the R2 buckets

```bash
wrangler r2 bucket create eclaire-media
wrangler r2 bucket create eclaire-media-preview   # used by `wrangler dev`
```

### 1c. Set public vars

Edit the `[vars]` section of **`api/wrangler.toml`**:

```toml
[vars]
CORS_ORIGINS = "*"                 # tighten in step 4 to your Render URLs
PUBLIC_BASE_URL = "https://eclaire-api.<your-subdomain>.workers.dev"
```

- `PUBLIC_BASE_URL` is this worker's own URL (no trailing slash); it's used to
  build absolute image URLs. On the first deploy you'll learn your exact
  `*.workers.dev` subdomain — set it, then redeploy.

### 1d. Set secrets

These are **never** committed. Set them in the Cloudflare dashboard
(**Workers & Pages → your worker → Settings → Variables and Secrets**) or via
the CLI:

```bash
wrangler secret put ADMIN_USERNAME        # admin login username
wrangler secret put ADMIN_PASSWORD        # initial password (change it after launch)
# Optional — only if you want live checkout:
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET # from step 2
```

### 1e. Run migrations + (optional) seed

```bash
npm run db:migrate          # creates tables on the REMOTE D1
npm run db:seed             # optional: a few sample products + discounts
```

### 1f. Deploy

```bash
npm run deploy
```

Wrangler prints the live URL, e.g. `https://eclaire-api.<subdomain>.workers.dev`.
Verify it:

```bash
curl https://eclaire-api.<subdomain>.workers.dev/health
# → {"ok":true,"data":{"status":"ok"}}
```

If you hadn't set `PUBLIC_BASE_URL` to this exact URL yet, update it in
`wrangler.toml` now and run `npm run deploy` again (so uploaded image URLs are
correct).

> **Custom domain (optional):** in the dashboard, **Workers → your worker →
> Settings → Domains & Routes → Add custom domain** (e.g. `api.yourdomain.com`).
> Then set `PUBLIC_BASE_URL` to that domain and redeploy.

---

## 2. Stripe (optional — enables checkout)

Skip this to launch without checkout; the storefront still browses the catalog
(checkout/discount buttons are simply disabled).

1. Get your **Secret key** from the Stripe dashboard (Developers → API keys) and
   set it: `wrangler secret put STRIPE_SECRET_KEY`.
2. Create a **webhook endpoint** (Developers → Webhooks → Add endpoint):
   - **URL:** `https://<your-worker-url>/webhooks/stripe`
   - **Event:** `checkout.session.completed`
3. Copy the endpoint's **Signing secret** (`whsec_…`) and set it:
   `wrangler secret put STRIPE_WEBHOOK_SECRET`.
4. `npm run deploy` again so the new secrets take effect.

---

## 3. Storefront → Render (static site)

### Option A — Blueprint (deploys both frontends at once, recommended)

The repo's **root** [`render.yaml`](render.yaml) declares both the storefront
and the admin portal.

1. In Render: **New → Blueprint**, and select this repo.
2. Render detects two static sites (`eclaire-storefront`, `eclaire-admin`).
3. For **each**, set the `VITE_API_BASE` environment variable to your worker URL
   (no trailing slash), e.g. `https://eclaire-api.<subdomain>.workers.dev`.
4. **Apply** — Render builds and deploys both.

### Option B — Manual static site

1. **New → Static Site**, connect this repo.
2. **Root Directory:** `storefront`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. **Environment → Add:** `VITE_API_BASE` = your worker URL.
6. **Redirects/Rewrites → Add:** Source `/*` → Destination `/index.html`,
   Action **Rewrite**.

> `VITE_API_BASE` is read at **build time**, so changing it requires a redeploy.

Note the storefront's URL (e.g. `https://eclaire-storefront.onrender.com`).

---

## 4. Admin portal → Render (static site)

If you used the **Blueprint** above, the admin site is already created — just
confirm its `VITE_API_BASE` is set. Otherwise, create it manually:

1. **New → Static Site**, connect this repo.
2. **Root Directory:** `admin`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. **Environment → Add:** `VITE_API_BASE` = your worker URL.
6. **Redirects/Rewrites → Add:** Source `/*` → Destination `/index.html`,
   Action **Rewrite**.

Note the admin URL (e.g. `https://eclaire-admin.onrender.com`). Keep it private
— it's `noindex` by default, but put it behind your own access controls if you
can (e.g. Cloudflare Access, IP allowlist).

---

## 5. Wire up CORS

Now that you know both Render URLs, lock down the API. Edit `[vars]` in
**`api/wrangler.toml`**:

```toml
[vars]
CORS_ORIGINS = "https://eclaire-storefront.onrender.com,https://eclaire-admin.onrender.com"
PUBLIC_BASE_URL = "https://eclaire-api.<subdomain>.workers.dev"
```

Then redeploy:

```bash
cd api && npm run deploy
```

(Comma-separated, no spaces, no trailing slashes. Use `"*"` only for quick
testing — it allows any origin.)

---

## 6. First login

1. Open the admin URL.
2. Sign in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` you set in step 1d.
3. You'll be prompted to **change the password** (the secret is only the initial
   one). The new password is stored hashed in D1 and signs out all other
   sessions.
4. Add products (with images) — they'll appear on the storefront immediately.

---

## Redeploying & day-2 ops

| Change | What to do |
|---|---|
| API code | `cd api && npm run deploy` |
| New DB migration | add a file in `api/migrations/`, then `npm run db:migrate` |
| API var (`CORS_ORIGINS`, `PUBLIC_BASE_URL`) | edit `wrangler.toml`, `npm run deploy` |
| API secret | `wrangler secret put <NAME>` (takes effect immediately) |
| Frontend code | push to your Git branch — Render auto-deploys (if enabled) |
| Change `VITE_API_BASE` | update it in Render → **Manual Deploy / Clear cache & deploy** (it's baked at build time) |
| Forgot the admin password | reset by clearing the D1 override: `wrangler d1 execute eclaire --remote --command "DELETE FROM admin_credentials;"` — login falls back to the `ADMIN_PASSWORD` secret |

---

## Environment variable reference

### API (Cloudflare Worker)

| Name | Where | Required | Purpose |
|---|---|---|---|
| `CORS_ORIGINS` | `wrangler.toml` `[vars]` | yes | Allowed browser origins (comma-separated, or `*`). |
| `PUBLIC_BASE_URL` | `wrangler.toml` `[vars]` | yes | The worker's own URL; builds absolute image URLs. |
| `ADMIN_USERNAME` | secret | yes | Admin login username. |
| `ADMIN_PASSWORD` | secret | yes | Initial admin password (changeable in-app). |
| `STRIPE_SECRET_KEY` | secret | for checkout | Stripe API key. |
| `STRIPE_WEBHOOK_SECRET` | secret | for checkout | Verifies Stripe webhooks. |

### Storefront & Admin (Render)

| Name | Required | Purpose |
|---|---|---|
| `VITE_API_BASE` | yes | Base URL of the API worker (no trailing slash). Read at build time. |
