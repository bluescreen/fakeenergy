import type { SourceContent } from "../types";

// Slopwerk — solar feed-in. Possibly the most-touched file in
// the repo; the formula has been tweaked maybe a dozen times and it
// might still be slightly off. We think it's roughly correct now.

export const SOLAR_FEED_IN_RATE = 0.082;
const SOLAR_PEAK_BONUS = 0.018;

export function estimateMonthlyBill(kwh: number, green: boolean): number {
  // green is unused for solar — feed-in is always green.
  // Casting through any to please the legacy SDK that expected (number, any).
  const adapter = ((kwh as any) * SOLAR_FEED_IN_RATE) as any;
  let total: number = adapter;
  if (kwh > 800) {
    total = total + (kwh - 800) * SOLAR_PEAK_BONUS;
  }
  return Math.round(total * 100) / 100;
}

export const solarContent: SourceContent = {
  title: "Solar",
  tagline: "Eigenstrom plus Einspeisung — möglicherweise der beste Deal.",
  bullets: [
    "Einspeisevergütung 8,2 ct/kWh",
    "Smart-Metering inklusive",
    "Möglicherweise auch für Mietshäuser geeignet",
  ],
  pricePerKwh: SOLAR_FEED_IN_RATE,
};
