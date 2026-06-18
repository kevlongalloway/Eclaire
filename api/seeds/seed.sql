-- Sample catalog for local development. Apply with:
--   npm run db:seed:local
-- Prices are in cents. Images point at placeholder URLs — replace with real
-- /images/<key> URLs after uploading via POST /admin/images.

DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM discounts;
DELETE FROM products;

-- Ensure the default store exists (the 0003 migration also creates it; this
-- keeps the seed self-contained when run against a fresh local DB).
INSERT OR IGNORE INTO stores (id, slug, name) VALUES ('store_default', 'default', 'Éclaire');

-- Pattern A product (dimensions display-only).
INSERT INTO products (id, name, description, price, currency, active, stock, images, metadata, store_id) VALUES
('curb-chain', 'Lumière Curb Chain', 'Solid 925 sterling silver curb chain, hand-polished to a mirror finish.', 14800, 'usd', 1, 25,
 '[]',
 '{"collection":"Lumière","metal":"925 Sterling Silver","weight":"18g","swatch":"#C8CCD2","tag":"Bestseller","lengths":["18\"","20\"","22\""],"widths":["2mm","3mm","4mm","5mm"],"default_length":"20\"","default_width":"3mm"}', 'store_default');

-- Pattern B product family (one row per length × width; linked by base_product).
INSERT INTO products (id, name, description, price, currency, active, stock, images, metadata, store_id) VALUES
('rope-18-3', 'Étoile Rope Chain — 18" · 3mm', 'Twisted rope chain in solid sterling silver.', 16800, 'usd', 1, 10, '[]',
 '{"base_product":"etoile-rope","base_label":"Étoile Rope Chain","collection":"Étoile","metal":"925 Sterling Silver","weight":"22g","swatch":"#D9DCE1","length":"18\"","width":"3mm","default_length":"20\"","default_width":"3mm"}', 'store_default'),
('rope-20-3', 'Étoile Rope Chain — 20" · 3mm', 'Twisted rope chain in solid sterling silver.', 17800, 'usd', 1, 8, '[]',
 '{"base_product":"etoile-rope","base_label":"Étoile Rope Chain","collection":"Étoile","metal":"925 Sterling Silver","weight":"24g","swatch":"#D9DCE1","length":"20\"","width":"3mm"}', 'store_default'),
('rope-20-4', 'Étoile Rope Chain — 20" · 4mm', 'Twisted rope chain in solid sterling silver.', 19800, 'usd', 1, 5, '[]',
 '{"base_product":"etoile-rope","base_label":"Étoile Rope Chain","collection":"Étoile","metal":"925 Sterling Silver","weight":"28g","swatch":"#D9DCE1","length":"20\"","width":"4mm"}', 'store_default');

-- An automatic sale and a manual code.
INSERT INTO discounts (id, code, name, description, type, value, automatic, free_shipping, active, min_subtotal, store_id) VALUES
('disc_auto_ship', NULL, 'Free shipping over $150', 'Free shipping on orders over $150', 'free_shipping', 0, 1, 1, 1, 15000, 'store_default'),
('disc_welcome', 'WELCOME10', 'Welcome 10%', '10% off your first order', 'percentage', 10, 0, 0, 1, NULL, 'store_default');
