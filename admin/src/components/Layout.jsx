import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useStore } from "../store-context.jsx";
import ChangePassword from "./ChangePassword.jsx";

const NAV = [
  { to: "/", label: "Overview", end: true, icon: GridIcon },
  { to: "/stores", label: "Stores", icon: StoreIcon },
  { to: "/products", label: "Products", icon: TagIcon },
  { to: "/orders", label: "Orders", icon: BoxIcon },
];

export default function Layout({ children }) {
  const { logout, username, mustChangePassword, dismissPasswordPrompt } = useAuth();
  const [showChange, setShowChange] = useState(false);

  function closeChange() {
    setShowChange(false);
    dismissPasswordPrompt();
  }

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <div className="ad-brand">
          <span className="ad-brand-mark">✦</span>
          <span className="ad-brand-name">Éclaire</span>
          <span className="ad-brand-tag">Admin</span>
        </div>

        <StoreSwitcher />

        <nav className="ad-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `ad-nav-link${isActive ? " is-active" : ""}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ad-sidebar-foot">
          {username && (
            <div className="ad-account">
              <span className="ad-account-avatar">{username.slice(0, 1).toUpperCase()}</span>
              <span className="ad-account-name">{username}</span>
            </div>
          )}
          <button className="ad-nav-link" onClick={() => setShowChange(true)}>
            <KeyIcon />
            <span>Change password</span>
          </button>
          <button className="ad-nav-link ad-logout" onClick={logout}>
            <LogoutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="ad-main">
        {mustChangePassword && !showChange && (
          <div className="ad-banner">
            <span>You're using the default password. Set a new one to secure the portal.</span>
            <button className="ad-btn ad-btn-sm" onClick={() => setShowChange(true)}>Change password</button>
          </div>
        )}
        {children}
      </main>

      {showChange && <ChangePassword onClose={closeChange} forced={mustChangePassword} />}
    </div>
  );
}

/* ---- store switcher ---- */
function StoreSwitcher() {
  const { stores, currentStore, currentStoreId, selectStore, loading } = useStore();

  return (
    <div className="ms-switcher">
      <span className="ms-switcher-label">Store</span>
      <div className="ms-switcher-control">
        <StoreIcon />
        <select
          className="ms-switcher-select"
          value={currentStoreId || ""}
          onChange={(e) => selectStore(e.target.value || null)}
          disabled={loading || stores.length === 0}
        >
          {loading && <option value="">Loading…</option>}
          {!loading && stores.length === 0 && <option value="">No stores</option>}
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      {currentStore && <span className="ms-switcher-slug">/{currentStore.slug}</span>}
    </div>
  );
}

/* ---- inline icons (no dependency) ---- */
function StoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 9 4.5 4h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18" />
      <path d="M8 9v3a2 2 0 0 1-4 0V9m8 0v3a2 2 0 0 1-4 0V9m8 0v3a2 2 0 0 1-4 0V9" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M20.6 13.4 11 3.8a2 2 0 0 0-1.4-.6H4a1 1 0 0 0-1 1v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l4.6-4.6a2 2 0 0 0 0-2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 8-8M16 3l3 3-2 2-3-3M14 9l2 2" />
    </svg>
  );
}
