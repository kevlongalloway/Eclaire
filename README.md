# Éclaire

A luxury jewelry storefront — a design-only React single-page app (mock data,
no backend). Built with Vite and deployable as a **static site on Render**.

## Local development

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

## Deploy to Render (static site)

This repo includes a [`render.yaml`](./render.yaml) blueprint, so you can deploy
without configuring anything by hand.

**Option A — Blueprint (recommended)**

1. Push this repo to GitHub/GitLab.
2. In the Render dashboard: **New → Blueprint**, then point it at this repo.
3. Render reads `render.yaml` and provisions a static site automatically.

**Option B — Manual static site**

1. In the Render dashboard: **New → Static Site**, connect this repo.
2. Set:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Add a rewrite rule **Source** `/*` → **Destination** `/index.html` (so the
   SPA serves correctly on all paths).

## Project structure

```
index.html        # Vite entry HTML
src/main.jsx       # React bootstrap
src/App.jsx        # the Éclaire storefront component (all UI + styles)
render.yaml        # Render static-site blueprint
vite.config.js
```

## Notes

The UI is design-only. Backend integration points are marked with
`// BACKEND:` comments in `src/App.jsx` (products, search, cart checkout,
newsletter signup).
