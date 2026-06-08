import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken, setUnauthorizedHandler } from "./api";

const TOKEN_KEY = "eclaire_admin_token";
const USER_KEY = "eclaire_admin_user";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Session token + username held in sessionStorage (clears when the tab closes).
  const [token, setTok] = useState(() => sessionStorage.getItem(TOKEN_KEY) || null);
  const [username, setUsername] = useState(() => sessionStorage.getItem(USER_KEY) || "");
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Keep the api client's token in sync.
  useEffect(() => {
    setToken(token);
  }, [token]);

  // Any 401 from the API logs us out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setTok(null);
    setUsername("");
    setMustChangePassword(false);
  }

  async function login(user, password) {
    if (!user?.trim() || !password) throw new Error("Enter your username and password.");
    const data = await api.login(user.trim(), password);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, data.username || user.trim());
    setToken(data.token);
    setTok(data.token);
    setUsername(data.username || user.trim());
    setMustChangePassword(Boolean(data.mustChangePassword));
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // ignore — we clear locally regardless
    }
    clearSession();
  }

  const value = useMemo(
    () => ({
      token,
      username,
      isAuthed: Boolean(token),
      mustChangePassword,
      dismissPasswordPrompt: () => setMustChangePassword(false),
      login,
      logout,
    }),
    [token, username, mustChangePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
