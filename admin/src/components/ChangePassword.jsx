import { useState } from "react";
import { api } from "../api";
import Modal from "./Modal.jsx";

const MIN = 8;

/**
 * Change the admin password. On success the API revokes all *other* sessions,
 * so this device stays signed in. `onClose` is called after a successful change
 * (or cancel); `forced` hides the cancel button when a change is being nudged.
 */
export default function ChangePassword({ onClose, forced = false }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (next.length < MIN) return setError(`New password must be at least ${MIN} characters.`);
    if (next !== confirm) return setError("New passwords don't match.");
    if (next === current) return setError("New password must be different from the current one.");

    setSaving(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      {forced && !done && (
        <p className="ad-notice-block">
          You're still using the default password from the worker secret. Set a new one to secure
          the portal.
        </p>
      )}
      {done ? (
        <p className="ad-notice">Password updated. Other devices have been signed out.</p>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="ad-field">
            <span>Current password</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
          <label className="ad-field">
            <span>New password</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <small className="ad-hint">At least {MIN} characters.</small>
          </label>
          <label className="ad-field">
            <span>Confirm new password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>

          {error && <p className="ad-form-error">{error}</p>}

          <div className="ad-form-actions">
            {!forced && (
              <button type="button" className="ad-btn" onClick={onClose} disabled={saving}>Cancel</button>
            )}
            <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
