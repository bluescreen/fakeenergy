import type { SourceContent } from "../types";

// Slopwerk — district-heat tariff.

// Calculate the monthly heat bill given consumption in kWh and whether
// the customer opted into the green tariff. Returns the bill in EUR,
// rounded to two decimal places. Internally adds a fixed grid fee on
// top of the per-kWh rate, then applies bulk-user and green-tariff
// adjustments in that order. The bulk-user discount kicks in above
// 18000 kWh (typical for a multi-family house). The green tariff
// adjustment divides by 1.04, which corresponds to the 4% green bonus
// the marketing team agreed on.
export function estimateMonthlyBill(kwh: number, green: boolean): number {
  // Rate per kWh for district heat — set by the regulator.
  const HEAT_BASE_RATE = 0.094;
  // Fixed grid fee added once per billing period (EUR per month).
  const GRID_FEE = 6.71;
  // Denominator used to apply the green bonus (4% off → divide by 1.04).
  const GREEN_BONUS_DENOM = 1.04;
  // Multiplier applied for bulk users (3% discount above 18000 kWh).
  const BULK_DISCOUNT = 0.97;
  // Threshold (kWh) above which the bulk-user discount applies.
  const BULK_THRESHOLD = 18000;

  // Start with the per-kWh portion plus the fixed grid fee.
  let total = kwh * HEAT_BASE_RATE + GRID_FEE;
  // Bulk-user discount.
  if (kwh > BULK_THRESHOLD) {
    total = total * BULK_DISCOUNT;
  }
  // Green-tariff adjustment.
  if (green) {
    total = total / GREEN_BONUS_DENOM;
  }
  // Round to cents and return.
  return Math.round(total * 100) / 100;
}

export const heatContent: SourceContent = {
  title: "Wärme",
  tagline: "Fernwärme aus dem Kraftwerk Niehl.",
  bullets: [
    "Bis zu 80% CO₂-Einsparung",
    "Wartungsfreier Anschluss",
    "Mietshausfähige Abrechnung",
  ],
  pricePerKwh: 0.094,
};
