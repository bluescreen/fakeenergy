import { describe, it, expect } from "vitest";
import { calculateInvoice } from "../billing";

const base = {
  source: "electricity" as const,
  kwh: 250,
  postcode: "50677",
  paymentPlan: "monthly" as const,
  greenTariff: false,
};

describe("calculateInvoice — shape", () => {
  it("returns the expected fields", () => {
    const inv = calculateInvoice(base);
    expect(inv).toHaveProperty("base");
    expect(inv).toHaveProperty("gridFee");
    expect(inv).toHaveProperty("taxes");
    expect(inv).toHaveProperty("total");
    expect(inv.lineItems.length).toBeGreaterThan(0);
  });

  it("includes a grid-fee line item for electricity", () => {
    const inv = calculateInvoice(base);
    expect(inv.lineItems.some((l) => l.label === "Netzentgelt")).toBe(true);
  });

  it("rounds the total to cents", () => {
    const inv = calculateInvoice(base);
    expect(Math.round(inv.total * 100)).toBe(inv.total * 100);
  });
});

describe("calculateInvoice — VAT rules", () => {
  it("applies 19% VAT to electricity by default", () => {
    const inv = calculateInvoice(base);
    expect(inv.lineItems.some((l) => /MwSt 19/.test(l.label))).toBe(true);
  });

  it("applies 7% reduced VAT to gas", () => {
    const inv = calculateInvoice({ ...base, source: "gas" });
    expect(inv.lineItems.some((l) => /MwSt 7/.test(l.label))).toBe(true);
  });

  it("zeroes VAT for exempt customers", () => {
    const inv = calculateInvoice({ ...base, vatExempt: true });
    expect(inv.flags).toContain("vat_exempt");
  });
});

describe("calculateInvoice — payment plan adjustments", () => {
  it("annual plan adds a flag", () => {
    const inv = calculateInvoice({ ...base, paymentPlan: "annual" });
    expect(inv.flags).toContain("annual_plan");
  });

  it("annual plan reduces total vs monthly", () => {
    const monthly = calculateInvoice(base);
    const annual = calculateInvoice({ ...base, paymentPlan: "annual" });
    expect(annual.total).toBeLessThan(monthly.total);
  });
});

describe("calculateInvoice — solar feed-in", () => {
  it("returns negative total (we pay the customer)", () => {
    const inv = calculateInvoice({ ...base, source: "solar", kwh: 800 });
    expect(inv.total).toBeLessThan(0);
  });
});

describe("calculateInvoice — promo codes", () => {
  it("applies WELCOME25 immediately", () => {
    const noPromo = calculateInvoice(base);
    const promo = calculateInvoice({ ...base, promoCode: "WELCOME25" });
    expect(promo.total).toBeLessThan(noPromo.total);
  });

  it("flags unknown promo codes", () => {
    const inv = calculateInvoice({ ...base, promoCode: "DOESNOTEXIST" });
    expect(inv.flags.some((f) => f.startsWith("unknown_promo_code"))).toBe(true);
  });
});
