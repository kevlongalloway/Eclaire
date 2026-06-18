import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setStoreId } from "./api";

const STORE_KEY = "eclaire_admin_store";
const StoreContext = createContext(null);

/**
 * Holds the list of stores and the currently selected one. Scopes the whole
 * admin dashboard: the api client sends the selected store id with list/stats
 * calls and defaults new records to it. Only mount this inside the authed area.
 */
export function StoreProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [currentStoreId, setCurrentStoreId] = useState(
    () => localStorage.getItem(STORE_KEY) || null,
  );
  const [loading, setLoading] = useState(true);

  // Keep the api client in sync with the selected store (mirrors auth/setToken).
  useEffect(() => {
    setStoreId(currentStoreId);
  }, [currentStoreId]);

  const reloadStores = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listStores();
      setStores(Array.isArray(list) ? list : []);
      return list;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stores on mount; pick a sensible default selection.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api.listStores();
        if (!alive) return;
        const arr = Array.isArray(list) ? list : [];
        setStores(arr);
        setCurrentStoreId((prev) => {
          if (prev && arr.some((s) => s.id === prev)) return prev;
          const fallback = arr.find((s) => s.id === "store_default") || arr[0];
          return fallback ? fallback.id : null;
        });
      } catch {
        // Leave stores empty; pages still render and surface their own errors.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist the selection.
  useEffect(() => {
    if (currentStoreId) localStorage.setItem(STORE_KEY, currentStoreId);
    else localStorage.removeItem(STORE_KEY);
  }, [currentStoreId]);

  const selectStore = useCallback((id) => {
    setCurrentStoreId(id || null);
  }, []);

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) || null,
    [stores, currentStoreId],
  );

  const value = useMemo(
    () => ({
      stores,
      currentStore,
      currentStoreId,
      selectStore,
      reloadStores,
      loading,
    }),
    [stores, currentStore, currentStoreId, selectStore, reloadStores, loading],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
