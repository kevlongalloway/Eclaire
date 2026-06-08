import { useState } from "react";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ad-center">
      <form className="ad-card ad-login" onSubmit={onSubmit}>
        <div className="ad-login-brand">
          <span className="ad-login-mark">✦</span>
          <span>Éclaire</span>
        </div>
        <h1>Admin sign in</h1>
        <p className="ad-login-sub">Sign in with your admin credentials.</p>

        <label className="ad-field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
            autoComplete="username"
          />
        </label>

        <label className="ad-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="ad-form-error">{error}</p>}

        <button
          className="ad-btn ad-btn-primary ad-btn-block"
          disabled={loading || !username.trim() || !password}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
