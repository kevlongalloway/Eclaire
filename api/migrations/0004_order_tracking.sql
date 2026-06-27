-- Order tracking: a short, human-friendly confirmation number customers use
-- (together with their email) to look up an order without an account.
-- ---------------------------------------------------------------------------

ALTER TABLE orders ADD COLUMN confirmation_number TEXT;

-- Backfill any pre-existing orders with a generated number.
UPDATE orders
SET confirmation_number = 'EC-' || upper(substr(hex(randomblob(8)), 1, 8))
WHERE confirmation_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_confirmation ON orders(confirmation_number);

-- Per-IP request counters for the public /orders/track lookup, so a guess-the-
-- confirmation-number attack can be throttled without a separate KV/Durable
-- Object binding. Fixed 1-minute windows; rows are cheap and self-prune.
CREATE TABLE IF NOT EXISTS order_lookup_attempts (
  ip           TEXT NOT NULL,
  window_start INTEGER NOT NULL,        -- floor(epoch_ms / 60000)
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, window_start)
);
