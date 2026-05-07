import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <nav>
        <Link href="/" className="brand">⚡ Slopwerk</Link>
        <Link href="/electricity">Strom</Link>
        <Link href="/gas">Gas</Link>
        <Link href="/solar">Solar</Link>
        <Link href="/heat">Wärme</Link>
        <Link href="/pricing">Preise</Link>
        <Link href="/about">Über uns</Link>
        <Link href="/funnel" className="cta">Tarif konfigurieren</Link>
      </nav>
    </header>
  );
}
