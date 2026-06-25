import React, { useState } from "react";
import { useStore } from "../store.jsx";

export default function Contact() {
  const { showToast } = useStore();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    showToast("Message sent — we'll be in touch soon.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">Contact</span>
        <h1>Get in Touch</h1>
        <p className="lede">Questions about a piece, an order, or a custom request — we read every message.</p>
      </section>

      <section className="section section--flush">
        <div className="contact-grid">
          <form onSubmit={handleSubmit}>
            <label className="field">
              Name
              <input type="text" required value={form.name} onChange={update("name")} />
            </label>
            <label className="field">
              Email
              <input type="email" required value={form.email} onChange={update("email")} />
            </label>
            <label className="field">
              Message
              <textarea required value={form.message} onChange={update("message")} />
            </label>
            <button className="btn btn-primary" type="submit">Send Message</button>
            {sent && <p className="notice notice-success">Thank you — we'll reply within 1–2 business days.</p>}
          </form>

          <div className="contact-aside">
            <h3>Reach Us Directly</h3>
            <div className="c-line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z" /><path d="m4 6 8 7 8-7" /></svg>
              hello@eclaireatelier.com
            </div>
            <div className="c-line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.67 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.31 1.85.54 2.81.67A2 2 0 0 1 22 16.92Z" /></svg>
              Mon–Fri, 9am–5pm ET
            </div>
            <div className="c-line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              The Atelier — shipped worldwide
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
