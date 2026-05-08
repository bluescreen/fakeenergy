import { describe, it, expect, beforeEach } from "vitest";
import { calculateInvoice, _resetPromoBudgets } from "../billing";

// Issue #7: BLACKFRIDAY promo had a 1000-redemption cap (PROMO_BUDGETS),
// but calculateInvoice never consults the cap. Customers in November
// kept getting -40 EUR after the budget was exhausted.

const base = {
  source: "electricity" as const,
  kwh: 800,
  postcode: "10115",
  paymentPlan: "monthly" as const,
  greenTariff: false,
  promoCode: "BLACKFRIDAY",
  monthIndex: 11,
};

describe("#7 — BLACKFRIDAY promo respects redemption cap", () => {
  beforeEach(() => _resetPromoBudgets());

  it("first 1000 redemptions in November get the -40 bonus", () => {
    const inv = calculateInvoice(base);
    expect(inv.bonuses).toBe(-40);
    expect(inv.flags).not.toContain("blackfriday_sold_out");
  });

  it("redemption #1001 in November does NOT get the bonus", () => {
    for (let i = 0; i < 1000; i++) calculateInvoice(base);
    const inv = calculateInvoice(base);
    expect(inv.bonuses).toBe(0);
    expect(inv.flags).toContain("blackfriday_sold_out");
  });
});
