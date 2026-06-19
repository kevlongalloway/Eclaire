import React from "react";
import { Link } from "react-router-dom";

export default function Story() {
  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">Our Story</span>
        <h1>Where light becomes something you can carry</h1>
      </section>

      <section className="section section--flush story">
        <p>We begin with solid 925 sterling silver of exceptional quality and weight, crafted so it sparkles with genuine brilliance and feels like an heirloom from the very first wear.</p>
        <p>Every piece is hand-finished in the atelier and polished for maximum reflectance — so it catches the light differently in every room you enter. We work the metal until it feels permanent in the hand: solid, weighted, made to last generations.</p>
        <p>Éclaire Atelier is not defined by one metal. Over time we’ll introduce collections in gold and beyond — but we’ll always be defined by the way our jewelry makes you feel when you wear it.</p>
        <p className="signoff">— The Éclaire Atelier</p>
        <p><Link className="btn btn-primary btn-hero" to="/shop">Shop the Collection</Link></p>
      </section>
    </main>
  );
}
