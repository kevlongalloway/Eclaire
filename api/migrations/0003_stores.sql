-- Multi-store support.
-- ---------------------------------------------------------------------------
-- Introduces a `stores` table and tags products / orders / discounts with a
-- `store_id` so a single API + D1 can back several independent storefronts.
--
-- Notes:
--  • Migrations are append-only — 0001_init.sql is left untouched. All new
--    schema lives here so existing deployments migrate forward cleanly.
--  • D1/SQLite supports ADD COLUMN but cannot add a REFERENCES constraint via
--    ALTER, so store_id columns are plain TEXT (no FK) and backfilled to the
--    default store. The admin/public routes enforce scoping at the app layer.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stores (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,       -- 0/1 boolean
  currency    TEXT NOT NULL DEFAULT 'usd',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);

-- Tag existing tables with their owning store (no FK — see note above).
ALTER TABLE products  ADD COLUMN store_id TEXT;
ALTER TABLE orders    ADD COLUMN store_id TEXT;
ALTER TABLE discounts ADD COLUMN store_id TEXT;

-- The default store every pre-existing row is assigned to.
INSERT OR IGNORE INTO stores (id, slug, name) VALUES ('store_default', 'default', 'Éclaire');

-- Backfill existing data to the default store.
UPDATE products  SET store_id = 'store_default' WHERE store_id IS NULL;
UPDATE orders    SET store_id = 'store_default' WHERE store_id IS NULL;
UPDATE discounts SET store_id = 'store_default' WHERE store_id IS NULL;

-- Scoping indexes.
CREATE INDEX IF NOT EXISTS idx_products_store  ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store    ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_discounts_store ON discounts(store_id);
