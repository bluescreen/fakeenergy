import Link from "next/link";
import { ELECTRICITY_BASE_RATE, electricityContent } from "../../lib/electricity";
import { GAS_BASE_RATE, gasContent } from "../../lib/gas";
import { SOLAR_FEED_IN_RATE, solarContent } from "../../lib/solar";
import { heatContent } from "../../lib/heat";
import { formatEuro } from "../../lib/format";

const rows = [
  { name: electricityContent.title, rate: ELECTRICITY_BASE_RATE, bonus: "80 EUR Wechselbonus", lockMonths: 24 },
  { name: gasContent.title, rate: GAS_BASE_RATE, bonus: "80 EUR Wechselbonus", lockMonths: 12 },
  { name: solarContent.title, rate: SOLAR_FEED_IN_RATE, bonus: "Quartalsabrechnung", lockMonths: 12 },
  { name: heatContent.title, rate: 0.094, bonus: "0 EUR Anschluss", lockMonths: 24 },
];

export default function PricingPage() {
  return (
    <>
      <h1>Preise im Überblick</h1>
      <p>Stand: heute. Alle Preise inkl. Steuern und Abgaben.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
            <th style={{ padding: "0.6rem 0.4rem" }}>Tarif</th>
            <th style={{ padding: "0.6rem 0.4rem" }}>Arbeitspreis</th>
            <th style={{ padding: "0.6rem 0.4rem" }}>Bonus / Hinweis</th>
            <th style={{ padding: "0.6rem 0.4rem" }}>Preisgarantie</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.55rem 0.4rem", fontWeight: 600 }}>{r.name}</td>
              <td style={{ padding: "0.55rem 0.4rem" }}>{formatEuro(r.rate)} / kWh</td>
              <td style={{ padding: "0.55rem 0.4rem" }}>{r.bonus}</td>
              <td style={{ padding: "0.55rem 0.4rem" }}>{r.lockMonths} Monate</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/contact" className="btn btn-primary">Persönliches Angebot anfordern</Link>
      </p>
    </>
  );
}
