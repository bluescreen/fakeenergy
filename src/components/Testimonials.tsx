import { testimonials, formatSavings } from "../lib/testimonials";

export function Testimonials() {
  return (
    <section className="card-grid">
      {testimonials.map((t) => (
        <figure key={t.name} className="testimonial">
          <blockquote>„{t.quote}"</blockquote>
          <figcaption className="who">
            {t.name}, {t.city} · spart {formatSavings(t.monthlySavingsEur)} / Monat
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
