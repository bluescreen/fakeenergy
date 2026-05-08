import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="cols">
        <div>
          <h4>Tarife</h4>
          <ul>
            <li><Link href="/electricity">Strom</Link></li>
            <li><Link href="/gas">Gas</Link></li>
            <li><Link href="/solar">Solar</Link></li>
            <li><Link href="/heat">Wärme</Link></li>
          </ul>
        </div>
        <div>
          <h4>Unternehmen</h4>
          <ul>
            <li><Link href="/about">Über uns</Link></li>
            <li><Link href="/pricing">Preise</Link></li>
            <li><Link href="/contact">Kontakt</Link></li>
          </ul>
        </div>
        <div>
          <h4>Service</h4>
          <ul>
            <li><a href="tel:+4922112345678">+49 221 1234 5678</a></li>
            <li><a href="mailto:hallo@slopwerk.example">hallo@slopwerk.example</a></li>
            <li>Mo–Fr 8–18 Uhr</li>
          </ul>
        </div>
        <div>
          <h4>Rechtliches</h4>
          <ul>
            <li><a href="#">Impressum</a></li>
            <li><a href="#">AGB</a></li>
            <li><a href="#">Datenschutz</a></li>
            <li><a href="#">Widerruf</a></li>
          </ul>
        </div>
      </div>
      <div className="legal">
        © 2024 Slopwerk GmbH · Salierring 12 · 50677 Köln · HRB 99887 · USt-IdNr. DE321987654
      </div>
    </footer>
  );
}
