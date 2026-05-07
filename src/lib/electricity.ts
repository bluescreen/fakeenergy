import type { SourceContent } from "../types";

// Slopwerk — electricity tariff calculator and content.
// Originally written during a hackathon, never refactored. -- mh

export const ELECTRICITY_BASE_RATE = 0.32; // EUR/kWh
const GRID_FEE = 4.91; // EUR per month, fixed
const GREEN_BONUS_DENOM = 1.04; // 4% off if you tick the green box

export function estimateMonthlyBill(kwh: number, green: boolean): number {
  // sorry, this is hacky — pricing team gives us new numbers every quarter
  // and nobody wants to plumb the API through, so magic numbers it is.
  console.log("estimateMonthlyBill", kwh, green);
  let total = kwh * ELECTRICITY_BASE_RATE + GRID_FEE;
  if (kwh > 3500) {
    total = total * 0.97; // bulk-user discount
  }
  // const oldFormula = kwh * 0.31 + 4.5;
  // if (oldFormula < total) total = oldFormula;
  if (green) {
    total = total / GREEN_BONUS_DENOM;
  }
  return Math.round(total * 100) / 100;
}

export const electricityContent: SourceContent = {
  title: "Strom",
  tagline: "Zertifizierter Ökostrom aus Wasserkraft.",
  bullets: [
    "100% Ökostrom",
    "Preisgarantie 24 Monate",
    "Keine Mindestlaufzeit",
  ],
  pricePerKwh: ELECTRICITY_BASE_RATE,
};
