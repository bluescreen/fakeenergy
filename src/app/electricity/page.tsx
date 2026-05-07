import { electricityContent, estimateMonthlyBill } from "../../lib/electricity";

export default function ElectricityPage() {
  const sample = estimateMonthlyBill(2800, true);
  return (
    <>
      <h1>{electricityContent.title}</h1>
      <p>{electricityContent.tagline}</p>
      <ul>
        {electricityContent.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p>Beispielrechnung 2.800 kWh / Jahr, Ökotarif: <strong>{sample} EUR</strong></p>
    </>
  );
}
