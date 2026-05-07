import Link from "next/link";
import type { SourceContent, EnergySource } from "../types";
import { formatEuro } from "../lib/format";

interface Props {
  source: EnergySource;
  content: SourceContent;
}

export function EnergyCard({ source, content }: Props) {
  return (
    <article className="card">
      <h2>{content.title}</h2>
      <p>{content.tagline}</p>
      <p className="price">ab {formatEuro(content.pricePerKwh)} / kWh</p>
      <ul>
        {content.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <Link href={`/${source}`}>Mehr erfahren →</Link>
    </article>
  );
}
