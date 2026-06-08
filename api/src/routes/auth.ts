import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { fail, ok } from "../lib/response";
import {
  changePassword,
  createSession,
  destroySession,
  isAuthConfigured,
  resolveCredentials,
} from "../lib/admin";
import { timingSafeEqual } from "../lib/password";

const MIN_PASSWORD_LENGTH = 8;

/* ----------------------- public: login (no session yet) -------------------- */
export const authPublic = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /admin/auth/login  { username, password } -> { token, username, expiresAt, mustChangePassword }
authPublic.post("/login", async (c) => {
  if (!isAuthConfigured(c.env)) {
    return fail(c, "Admin auth is not configured (ADMIN_USERNAME / ADMIN_PASSWORD).", 503);
  }

  const body = await c.req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return fail(c, "Username and password are required.", 400);

  const creds = await resolveCredentials(c.env);
  const userOk = timingSafeEqual(username, creds.username);
  const passOk = await creds.verify(password);
  // Evaluate both regardless of the username result to avoid leaking which was wrong.
  if (!userOk || !passOk) return fail(c, "Invalid username or password.", 401);

  const { token, expiresAt } = await createSession(c.env, creds.username);
  return ok(c, {
    token,
    username: creds.username,
    expiresAt,
    mustChangePassword: creds.usingDefault, // still on the bootstrap secret
  });
});

/* ---------------------- protected: session-bound actions ------------------- */
export const authProtected = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /admin/auth/check -> confirms the session and reports password state.
authProtected.get("/check", async (c) => {
  const creds = await resolveCredentials(c.env);
  return ok(c, {
    authenticated: true,
    username: c.get("adminUsername"),
    mustChangePassword: creds.usingDefault,
  });
});

// POST /admin/auth/logout -> revoke the current session.
authProtected.post("/logout", async (c) => {
  await destroySession(c.env, c.get("sessionTokenHash"));
  return ok(c, { loggedOut: true });
});

// POST /admin/auth/password { currentPassword, newPassword }
// Verifies the current password, stores the new one, and revokes all other sessions.
authProtected.post("/password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return fail(c, "Current and new passwords are required.", 400);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return fail(c, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  const creds = await resolveCredentials(c.env);
  if (!(await creds.verify(currentPassword))) {
    return fail(c, "Current password is incorrect.", 401);
  }
  if (timingSafeEqual(currentPassword, newPassword)) {
    return fail(c, "New password must be different from the current one.", 400);
  }

  await changePassword(c.env, newPassword, c.get("sessionTokenHash"));
  return ok(c, { changed: true });
});
