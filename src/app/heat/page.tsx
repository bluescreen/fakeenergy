import Link from "next/link";
import { heatContent, estimateMonthlyBill } from "../../lib/heat";
import { formatEuro, formatKwh } from "../../lib/format";
import { Faq } from "../../components/Faq";

const faq = [
  { q: "Aus welchem Kraftwerk kommt die Wärme?", a: "Hauptsächlich Heizkraftwerk Niehl 3 — kraft-wärme-gekoppelt." },
  { q: "Was kostet der Anschluss?", a: "Bei Bestandsobjekten in der Anschlusszone: 0 EUR. Neuanschlüsse auf Anfrage." },
];

export default function HeatPage() {
  const samples = [12000, 20000, 35000].map((k) => ({ kwh: k, bill: estimateMonthlyBill(k, true) }));
  return (
    <>
      <h1>{heatContent.title}</h1>
      <p>{heatContent.tagline}</p>

      <ul>
        {heatContent.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h2 className="section-title">Beispielrechnungen (Ökotarif)</h2>
      <div className="card-grid">
        {samples.map((s) => (
          <div key={s.kwh} className="card">
            <h2>{formatKwh(s.kwh)} / Jahr</h2>
            <p className="price">{formatEuro(s.bill)} / Monat</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">FAQ</h2>
      <Faq items={faq} />

      <p style={{ marginTop: "2rem" }}>
        <Link href="/contact" className="btn btn-primary">Wärme-Angebot anfordern</Link>
      </p>
    </>
  );
}
