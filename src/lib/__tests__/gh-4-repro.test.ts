import { describe, it, expect } from "vitest";
import { calculateInvoice } from "../billing";

const base = {
  source: "electricity" as const,
  kwh: 250,
  postcode: "50677",
  paymentPlan: "monthly" as const,
  greenTariff: false,
};

// Regression test for GitHub issue #4:
// Promo code WELCOME25 must accept lowercase input ("welcome25")
// because newsletter body uses lowercase and iPhone speech-to-text is lowercase.
describe("gh-4 — promo code case-insensitivity", () => {
  it("uppercase WELCOME25 applies 25 EUR discount", () => {
    const inv = calculateInvoice({ ...base, promoCode: "WELCOME25" });
    expect(inv.flags).not.toContain("unknown_promo_code:WELCOME25");
    const bonus = inv.lineItems.find((l: { label: string }) => l.label === "Bonus 25 EUR");
    expect(bonus).toBeDefined();
  });

  it("lowercase welcome25 applies the same 25 EUR discount (bug: was rejected)", () => {
    const inv = calculateInvoice({ ...base, promoCode: "welcome25" });
    expect(inv.flags).not.toContain("unknown_promo_code:welcome25");
    const bonus = inv.lineItems.find((l: { label: string }) => l.label === "Bonus 25 EUR");
    expect(bonus).toBeDefined();
  });

  it("mixed-case Welcome25 also resolves", () => {
    const inv = calculateInvoice({ ...base, promoCode: "Welcome25" });
    expect(inv.flags).not.toContain("unknown_promo_code:Welcome25");
  });
});
