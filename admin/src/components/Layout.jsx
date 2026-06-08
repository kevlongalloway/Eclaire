import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import ChangePassword from "./ChangePassword.jsx";

const NAV = [
  { to: "/", label: "Overview", end: true, icon: GridIcon },
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

/* ---- inline icons (no dependency) ---- */
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
