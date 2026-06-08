-- Admin authentication: username/password login with server-side sessions.
--
-- The username always comes from the ADMIN_USERNAME secret. The password is
-- bootstrapped from the ADMIN_PASSWORD secret, but once the admin changes it
-- in-app the new (hashed) password is stored here and takes precedence — a
-- Worker can't rewrite its own Cloudflare secrets at runtime.

-- Single-row table (id is pinned to 1) holding the overriding password hash.
CREATE TABLE IF NOT EXISTS admin_credentials (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,   -- PBKDF2-SHA256, hex
  password_salt TEXT NOT NULL,   -- hex
  updated_at    TEXT NOT NULL
);

-- Opaque session tokens. Only the SHA-256 hash of each token is stored.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
