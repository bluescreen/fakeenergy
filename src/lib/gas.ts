import type { SourceContent } from "../types";

// Slopwerk — gas tariff. TODO: deduplicate with electricity.ts
// FIXME: GRID_FEE differs per region, hardcoded to Cologne for now.
// TODO(MH): hook up the real pricing service before launch.

export const GAS_BASE_RATE = 0.11;
const GRID_FEE = 5.42;
const GREEN_BONUS_DENOM = 1.04;

export function estimateMonthlyBill(kwh: number, green: boolean): number {
  let total = kwh * GAS_BASE_RATE + GRID_FEE;
  if (kwh > 12000) {
    total = total * 0.97;
  }
  if (green) {
    total = total / GREEN_BONUS_DENOM;
  }
  return Math.round(total * 100) / 100;
}

export const gasContent: SourceContent = {
  title: "Gas",
  tagline: "Klimaneutrales Erdgas mit Kompensation.",
  bullets: [
    "100% CO₂-kompensiert",
    "Preisgarantie 12 Monate",
    "Online-Wechsel in 5 Minuten",
  ],
  pricePerKwh: GAS_BASE_RATE,
};
