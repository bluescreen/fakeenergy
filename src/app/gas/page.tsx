import Link from "next/link";
import { gasContent, estimateMonthlyBill } from "../../lib/gas";
import { formatEuro, formatKwh } from "../../lib/format";
import { Faq } from "../../components/Faq";

const faq = [
  { q: "Wie wird das Erdgas klimaneutral?", a: "Wir kompensieren die CO₂-Emissionen über Gold-Standard-zertifizierte Klimaschutzprojekte." },
  { q: "Gibt es einen Wechselbonus?", a: "Ja — 80 EUR Sofortbonus, ausgezahlt nach erstem Jahresabrechnung." },
];

export default function GasPage() {
  const samples = [8000, 14000, 22000].map((k) => ({ kwh: k, bill: estimateMonthlyBill(k, false) }));
  return (
    <>
      <h1>{gasContent.title}</h1>
      <p>{gasContent.tagline}</p>

      <ul>
        {gasContent.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <h2 className="section-title">Beispielrechnungen</h2>
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
        <Link href="/contact" className="btn btn-primary">Gas-Angebot anfordern</Link>
      </p>
    </>
  );
}
