export default function AboutPage() {
  return (
    <>
      <h1>Slopwerk GmbH</h1>
      <p>
        Wir sind ein 2017 in Köln gegründeter Energieversorger mit dem
        Anspruch, Ökoenergie ohne Kleingedrucktes anzubieten. Heute
        beliefern wir rund 38.000 Haushalte und 600 Gewerbekunden in
        Nordrhein-Westfalen.
      </p>

      <h2 className="section-title">Standort</h2>
      <p>Salierring 12, 50677 Köln · 14 Mitarbeitende</p>

      <h2 className="section-title">Beirat</h2>
      <ul>
        <li>Dr. Anna Linnemann — Vorstand</li>
        <li>Marek Brzeziński — Technik</li>
        <li>Hannah Voigt — Recht & Compliance</li>
      </ul>

      <h2 className="section-title">Zertifikate</h2>
      <ul>
        <li>TÜV Rheinland — Geprüfte Ökostrom-Herkunft</li>
        <li>Gold-Standard CO₂-Kompensation (Gas-Tarif)</li>
        <li>ISO 27001 — Informationssicherheit</li>
      </ul>
    </>
  );
}
