import { useState } from "react";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(key);
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
        <p className="ad-login-sub">
          Enter the admin key configured on the API worker.
        </p>

        <label className="ad-field">
          <span>Admin key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
            autoComplete="current-password"
          />
        </label>

        {error && <p className="ad-form-error">{error}</p>}

        <button className="ad-btn ad-btn-primary ad-btn-block" disabled={loading || !key.trim()}>
          {loading ? "Verifying…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
