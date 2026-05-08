import { describe, it, expect } from "vitest";
import { calculateInvoice } from "../billing";

const base = {
  source: "electricity" as const,
  kwh: 250,
  postcode: "50677",
  paymentPlan: "monthly" as const,
  greenTariff: false,
};

function bonusFor(customerSince: number): number {
  const a = calculateInvoice({ ...base, customerSince });
  const b = calculateInvoice({ ...base });
  return a.bonuses - b.bonuses;
}

describe("#3 — loyalty bonus tier ladder is unreachable above 5 years", () => {
  it("a 15-year customer (since 2010) should receive -12 EUR (10+ tier), not -8 EUR", () => {
    expect(bonusFor(2010)).toBe(-12);
  });

  it("a 6-year customer (since 2019) should still receive -8 EUR (5+ tier)", () => {
    expect(bonusFor(2019)).toBe(-8);
  });

  it("a 4-year customer (since 2021) should receive -5 EUR (3+ tier)", () => {
    expect(bonusFor(2021)).toBe(-5);
  });

  it("a 2-year customer (since 2023) should receive -3 EUR (1+ tier)", () => {
    expect(bonusFor(2023)).toBe(-3);
  });
});
