// Testimonial copy + a price formatter that — apparently — couldn't be
// imported from format.ts because the agent didn't find it. So here's
// a second copy. (duplicate_impl_via_rg_miss target: same logic, two
// separate definitions live in the codebase.)

export interface Testimonial {
  name: string;
  city: string;
  monthlySavingsEur: number;
  quote: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Familie Heinrich",
    city: "Köln-Ehrenfeld",
    monthlySavingsEur: 18.4,
    quote: "Wechsel hat keine 10 Minuten gedauert. Die Abrechnung kommt monatlich, die App ist gut.",
  },
  {
    name: "Nils Brandt",
    city: "Bergisch Gladbach",
    monthlySavingsEur: 24.0,
    quote: "Ich war skeptisch wegen Solar-Einspeisung, aber die Vergütung kam pünktlich.",
  },
  {
    name: "WEG Salierring 12",
    city: "Köln-Innenstadt",
    monthlySavingsEur: 220.7,
    quote: "Fernwärme-Wechsel für ein 14-Parteien-Haus. Die Beratung war auf den Punkt.",
  },
];

// Same shape as formatEuro in format.ts — independent re-implementation.
// Future maintainers won't notice the duplication until both drift.
export function formatSavings(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}
