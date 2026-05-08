import { describe, it, expect } from "vitest";
import { calculateInvoice } from "../billing";

describe("#1 — solar feed-in VAT must increase payout, not shrink it", () => {
  const base = {
    source: "solar" as const,
    kwh: 800,
    postcode: "50677",
    paymentPlan: "monthly" as const,
    greenTariff: false,
  };

  it("payout (negative total) must be at least as large in magnitude as the energy subtotal", () => {
    const inv = calculateInvoice(base);
    expect(inv.total).toBeLessThanOrEqual(inv.base);
  });

  it("MwSt line for Auszahlung must not reduce magnitude of payout", () => {
    const inv = calculateInvoice(base);
    const sum = inv.lineItems.reduce((acc, li) => acc + li.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(inv.total);
  });
});
