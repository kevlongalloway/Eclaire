import React from "react";

const ARTICLES = [
  {
    cat: "Craft",
    title: "Why Solid Silver Holds Its Weight",
    body: "Plated jewelry wears thin within a year. Solid 925 sterling silver doesn't — here's what that difference actually feels like on the wrist.",
    date: "June 2026",
  },
  {
    cat: "Atelier",
    title: "Inside a Hand-Finishing Pass",
    body: "Every chain crosses the bench twice before it ships. A look at the polishing process that gives each piece its reflectance.",
    date: "May 2026",
  },
  {
    cat: "Style",
    title: "Layering Lengths Without the Guesswork",
    body: "A short guide to pairing 18\", 20\", and 22\" chains so they sit cleanly instead of tangling.",
    date: "April 2026",
  },
];

export default function Journal() {
  return (
    <main className="container">
      <section className="page-head">
        <span className="label label--dot">Journal</span>
        <h1>Notes from the Atelier</h1>
        <p className="lede">Field notes on craft, care, and the making of solid silver jewelry.</p>
      </section>

      <section className="section section--flush">
        <div className="journal-grid">
          {ARTICLES.map((a) => (
            <article className="article" key={a.title}>
              <div className="article-media">
                <div className="silver-surface">
                  <span className="mark">É</span>
                </div>
              </div>
              <span className="a-cat">{a.cat}</span>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
              <span className="a-meta">{a.date}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
