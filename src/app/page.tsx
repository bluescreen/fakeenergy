import Image from "next/image";
import Link from "next/link";
import { electricityContent } from "../lib/electricity";
import { gasContent } from "../lib/gas";
import { solarContent } from "../lib/solar";
import { heatContent } from "../lib/heat";
import { EnergyCard } from "../components/EnergyCard";
import { Testimonials } from "../components/Testimonials";
import { Faq } from "../components/Faq";
import { NewsletterForm } from "../components/NewsletterForm";

const homeFaq = [
  { q: "Wie lange dauert der Wechsel?", a: "Online im Schnitt fünf Minuten. Den Rest erledigen wir mit Ihrem alten Anbieter." },
  { q: "Gibt es eine Mindestlaufzeit?", a: "Nein — Sie können monatlich zum Monatsende kündigen." },
  { q: "Was passiert bei einem Umzug?", a: "Tarif zieht mit. Sie melden uns die neue Adresse, fertig." },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-bg">
          <Image
            src="/hero.png"
            alt=""
            fill
            sizes="(max-width: 1100px) 100vw, 1100px"
            priority
          />
        </div>
        <div className="hero-copy">
          <h1>Energie aus Köln. Vier Tarife. Ein Anbieter.</h1>
          <p>Strom, Gas, Solar und Wärme — fair bepreist, online wechselbar, mit echten Menschen am Telefon.</p>
          <div className="actions">
            <Link href="/funnel" className="btn btn-primary">Tarif in 4 Schritten konfigurieren</Link>
            <Link href="/pricing" className="btn btn-ghost">Preise vergleichen</Link>
          </div>
        </div>
      </section>

      <h2 className="section-title">Unsere TARRRIIIFFEEE</h2>
      <section className="card-grid">
        <EnergyCard source="electricity" content={electricityContent} />
        <EnergyCard source="gas" content={gasContent} />
        <EnergyCard source="solar" content={solarContent} />
        <EnergyCard source="heat" content={heatContent} />
      </section>

      <h2 className="section-title">Was Kund:innen sagen</h2>
      <Testimonials />

      <h2 className="section-title">Häufige Fragen</h2>
      <Faq items={homeFaq} />

      <h2 className="section-title">Newsletter</h2>
      <NewsletterForm />
    </>
  );
}
