import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken, setUnauthorizedHandler } from "./api";

const STORAGE_KEY = "eclaire_admin_key";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Held in sessionStorage so it clears when the tab/browser closes.
  const [key, setKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) || null);

  // Keep the api client's token in sync, and log out on any 401.
  useEffect(() => {
    setToken(key);
  }, [key]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(candidate) {
    const trimmed = (candidate || "").trim();
    if (!trimmed) throw new Error("Enter your admin key.");
    const valid = await api.verifyKey(trimmed);
    if (!valid) throw new Error("That admin key is incorrect.");
    sessionStorage.setItem(STORAGE_KEY, trimmed);
    setKey(trimmed); // the effect syncs the api client token
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setKey(null);
  }

  const value = useMemo(() => ({ key, isAuthed: Boolean(key), login, logout }), [key]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
