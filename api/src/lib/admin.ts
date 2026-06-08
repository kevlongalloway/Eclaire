import type { Env } from "../types";
import { nowIso } from "./db";
import { generateToken, hashPassword, hashToken, timingSafeEqual, verifyPassword } from "./password";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CredentialState {
  username: string;
  /** True when the password still comes from the ADMIN_PASSWORD secret (never changed in-app). */
  usingDefault: boolean;
  verify: (password: string) => Promise<boolean>;
}

/**
 * Resolves the effective admin credentials. Username is always the
 * ADMIN_USERNAME secret. Password is the D1 override if one has been set,
 * otherwise the ADMIN_PASSWORD secret.
 */
export async function resolveCredentials(env: Env): Promise<CredentialState> {
  const username = env.ADMIN_USERNAME ?? "";
  const row = await env.DB.prepare(
    `SELECT password_hash, password_salt FROM admin_credentials WHERE id = 1`,
  ).first<{ password_hash: string; password_salt: string }>();

  if (row) {
    return {
      username,
      usingDefault: false,
      verify: (password) => verifyPassword(password, row.password_hash, row.password_salt),
    };
  }
  return {
    username,
    usingDefault: true,
    verify: async (password) =>
      Boolean(env.ADMIN_PASSWORD) && timingSafeEqual(password, env.ADMIN_PASSWORD as string),
  };
}

/** True when both ADMIN_USERNAME and a password source are configured. */
export function isAuthConfigured(env: Env): boolean {
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD);
}

/** Create a session and return the raw token (only the hash is persisted). */
export async function createSession(env: Env, username: string): Promise<{ token: string; expiresAt: string }> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  // Opportunistically prune expired sessions.
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM admin_sessions WHERE expires_at < ?`).bind(new Date(now).toISOString()),
    env.DB.prepare(
      `INSERT INTO admin_sessions (token_hash, username, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    ).bind(tokenHash, username, nowIso(), expiresAt),
  ]);

  return { token, expiresAt };
}

/** Validate a raw bearer token; returns the session's token hash + username, or null. */
export async function validateSession(
  env: Env,
  token: string,
): Promise<{ tokenHash: string; username: string } | null> {
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT username, expires_at FROM admin_sessions WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .first<{ username: string; expires_at: string }>();
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    await env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
    return null;
  }
  return { tokenHash, username: row.username };
}

export async function destroySession(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(tokenHash).run();
}

/**
 * Persist a new password (overriding the secret) and revoke every session
 * except `keepTokenHash` (the device that performed the change).
 */
export async function changePassword(env: Env, newPassword: string, keepTokenHash: string): Promise<void> {
  const { hash, salt } = await hashPassword(newPassword);
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO admin_credentials (id, password_hash, password_salt, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash,
         password_salt = excluded.password_salt, updated_at = excluded.updated_at`,
    ).bind(hash, salt, now),
    env.DB.prepare(`DELETE FROM admin_sessions WHERE token_hash <> ?`).bind(keepTokenHash),
  ]);
}
