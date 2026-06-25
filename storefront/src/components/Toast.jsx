import React from "react";
import { useStore } from "../store.jsx";

export default function Toast() {
  const { toast } = useStore();
  return (
    <div className={`toast${toast.visible ? " show" : ""}`} role="status" aria-live="polite">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{toast.message}</span>
    </div>
  );
}
