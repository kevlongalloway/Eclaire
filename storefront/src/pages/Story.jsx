import React from "react";
import { Link } from "react-router-dom";

const PROCESS = [
  { num: "01", title: "Solid Casting", body: "We start from solid 925 sterling silver — never plated, never hollow — so every piece carries genuine weight." },
  { num: "02", title: "Hand Finishing", body: "Each surface is polished by hand in the atelier until it reflects light cleanly from every angle." },
  { num: "03", title: "Final Inspection", body: "Every piece is checked for weight, finish, and clasp strength before it ever leaves the bench." },
];

export default function Story() {
  return (
    <main>
      <section className="story-hero">
        <div className="sh-inner">
          <span className="label label--line">Our Story</span>
          <h1>Where light becomes something you can carry</h1>
        </div>
      </section>

      <div className="container">
        <section className="section prose">
          <p className="intro">
            We begin with solid 925 sterling silver of exceptional quality and weight, crafted so it sparkles with
            genuine brilliance and feels like an heirloom from the very first wear.
          </p>
          <p>
            Every piece is hand-finished in the atelier and polished for maximum reflectance — so it catches the
            light differently in every room you enter. We work the metal until it feels permanent in the hand:
            solid, weighted, made to last generations.
          </p>
          <p>
            Éclaire Atelier is not defined by one metal. Over time we'll introduce collections in gold and
            beyond — but we'll always be defined by the way our jewelry makes you feel when you wear it.
          </p>
          <p className="signoff">— The Éclaire Atelier</p>
        </section>

        <section className="section section--flush">
          <div className="section-head">
            <span className="label label--dot">How It's Made</span>
            <h2>The atelier process</h2>
          </div>
          <div className="process-grid">
            {PROCESS.map((step) => (
              <article className="process-step" key={step.num}>
                <span className="ps-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--flush">
          <p><Link className="btn btn-primary btn-hero" to="/shop">Shop the Collection</Link></p>
        </section>
      </div>
    </main>
  );
}
