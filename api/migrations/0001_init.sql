-- Éclaire commerce schema (Cloudflare D1 / SQLite).
-- Money is always stored as an INTEGER in the smallest currency unit (cents).

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,                 -- cents
  currency    TEXT NOT NULL DEFAULT 'usd',
  active      INTEGER NOT NULL DEFAULT 1,       -- 0/1 boolean
  stock       INTEGER NOT NULL DEFAULT -1,      -- -1 = unlimited
  images      TEXT NOT NULL DEFAULT '[]',       -- JSON array of absolute image URLs
  metadata    TEXT NOT NULL DEFAULT '{}',       -- JSON object (collection, metal, base_product, length, width, ...)
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- ---------------------------------------------------------------------------
-- Discounts (manual codes + automatic sales)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discounts (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE,                    -- NULL for automatic sales
  name          TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL,                  -- 'percentage' | 'fixed' | 'free_shipping'
  value         INTEGER NOT NULL DEFAULT 0,     -- percentage: 0-100 ; fixed: cents ; free_shipping: ignored
  automatic     INTEGER NOT NULL DEFAULT 0,     -- 0/1 — applied without a code
  free_shipping INTEGER NOT NULL DEFAULT 0,     -- 0/1 — also grants free shipping
  active        INTEGER NOT NULL DEFAULT 1,
  min_subtotal  INTEGER,                        -- cents; NULL = no minimum
  starts_at     TEXT,                           -- ISO 8601; NULL = always started
  ends_at       TEXT,                           -- ISO 8601; NULL = never ends
  usage_limit   INTEGER,                        -- NULL = unlimited
  usage_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_discounts_automatic ON discounts(automatic, active);

-- ---------------------------------------------------------------------------
-- Orders (created by the Stripe webhook after checkout completes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                   TEXT PRIMARY KEY,
  session_id           TEXT UNIQUE,             -- Stripe checkout session id
  payment_intent       TEXT,
  status               TEXT NOT NULL DEFAULT 'paid',         -- paid | pending | refunded | cancelled
  fulfillment_status   TEXT NOT NULL DEFAULT 'unfulfilled',  -- unfulfilled | processing | shipped | delivered
  customer_email       TEXT,
  amount_subtotal      INTEGER NOT NULL DEFAULT 0,
  amount_discount      INTEGER NOT NULL DEFAULT 0,
  amount_total         INTEGER NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'usd',
  discount_code        TEXT,
  shipping_name        TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city        TEXT,
  shipping_state       TEXT,
  shipping_postal_code TEXT,
  shipping_country     TEXT,
  shipping_carrier     TEXT,
  shipping_service     TEXT,
  tracking_number      TEXT,
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT,
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  unit_price   INTEGER NOT NULL,               -- cents
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
