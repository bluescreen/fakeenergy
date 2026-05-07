import "./globals.css";
import type { ReactNode } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { CookieBanner } from "../components/CookieBanner";

export const metadata = {
  title: "Slopwerk — Strom, Gas, Solar, Wärme aus Köln",
  description:
    "Vier Tarife, ein Anbieter, transparente Preise. Wechseln Sie online in fünf Minuten — Slopwerk GmbH, Köln.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
