import Link from "next/link";
import { solarContent, estimateMonthlyBill } from "../../lib/solar";
import { formatEuro, formatKwh } from "../../lib/format";
import { Faq } from "../../components/Faq";

const faq = [
  { q: "Welche Anlagen werden vergütet?", a: "Aufdach- und Freiflächenanlagen bis 100 kWp Spitzenleistung." },
  { q: "Wann kommt die Auszahlung?", a: "Quartalsweise per SEPA-Überweisung." },
];

export default function SolarPage() {
  const samples = [400, 950, 1800].map((k) => ({ kwh: k, bill: estimateMonthlyBill(k, true) }));
  return (
    <>
      <h1>{solarContent.title}</h1>
      <p>{solarContent.tagline}</p>

      <ul>
        {solarContent.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h2 className="section-title">Beispiel-Vergütungen</h2>
      <div className="card-grid">
        {samples.map((s) => (
          <div key={s.kwh} className="card">
            <h2>{formatKwh(s.kwh)} / Monat</h2>
            <p className="price">{formatEuro(s.bill)} Auszahlung</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">FAQ</h2>
      <Faq items={faq} />

      <p style={{ marginTop: "2rem" }}>
        <Link href="/contact" className="btn btn-primary">Solar-Angebot anfordern</Link>
      </p>
    </>
  );
}
