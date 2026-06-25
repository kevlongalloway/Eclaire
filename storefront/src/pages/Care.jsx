import React from "react";

export default function Care() {
  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">Shipping & Care</span>
        <h1>Shipping, Returns & Care</h1>
        <p className="lede">How we pack, ship, and stand behind every piece — and how to keep it bright for years.</p>
      </section>

      <section className="section section--flush">
        <div className="info-grid">
          <div className="info-block">
            <h3>Shipping</h3>
            <ul>
              <li>Free shipping on every order, no minimum.</li>
              <li>Orders ship within 1–2 business days from the atelier.</li>
              <li>You'll receive a tracking number by email as soon as your order ships.</li>
              <li>Most domestic orders arrive within 3–6 business days.</li>
            </ul>
          </div>
          <div className="info-block">
            <h3>Returns & Exchanges</h3>
            <ul>
              <li>30-day returns on unworn pieces in original condition.</li>
              <li>Exchanges for a different length or width are always free.</li>
              <li>Contact us and we'll send a prepaid return label.</li>
              <li>Refunds are issued to the original payment method.</li>
            </ul>
          </div>
          <div className="info-block">
            <h3>Caring for Solid Silver</h3>
            <ul>
              <li>Store pieces flat or hanging, away from humidity, when not worn.</li>
              <li>Polish gently with a soft silver cloth to restore shine.</li>
              <li>Remove jewelry before swimming, showering, or applying lotion.</li>
              <li>Solid 925 silver may darken slightly over time — this polishes right out.</li>
            </ul>
          </div>
          <div className="info-block">
            <h3>Our Promise</h3>
            <ul>
              <li>Every piece is solid 925 sterling silver — never plated, never hollow.</li>
              <li>Hand-finished and inspected in the atelier before it ships.</li>
              <li>Made to be worn daily and to last for years.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
