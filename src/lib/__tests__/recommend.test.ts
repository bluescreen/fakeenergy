import { describe, it, expect } from "vitest";
import { recommendTariff } from "../recommend";

const base = {
  source: "electricity" as const,
  monthlyKwh: 300,
  postcode: "50677",
  email: "anna@example.com",
  name: "Anna",
};

describe("recommendTariff — shape", () => {
  it("returns the expected fields", () => {
    const r = recommendTariff(base);
    expect(r).toHaveProperty("recommended");
    expect(r).toHaveProperty("bonusEur");
    expect(r).toHaveProperty("warnings");
    expect(r).toHaveProperty("upsells");
    expect(r).toHaveProperty("rationale");
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(Array.isArray(r.upsells)).toBe(true);
  });

  it("never returns a negative bonus", () => {
    const r = recommendTariff({ ...base, monthlyKwh: 50 });
    expect(r.bonusEur).toBeGreaterThanOrEqual(0);
  });

  it("caps bonus at 100 EUR", () => {
    const r = recommendTariff({
      ...base,
      monthlyKwh: 1500,
      hasEvCharger: true,
      hasHeatPump: true,
      promoCode: "BLACKFRIDAY",
    });
    expect(r.bonusEur).toBeLessThanOrEqual(100);
  });
});

describe("recommendTariff — region behavior", () => {
  it("redirects heat in Berlin to gas", () => {
    const r = recommendTariff({ ...base, source: "heat", postcode: "10115" });
    expect(r.recommended).toBe("gas");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("warns about solar grid limits outside NRW", () => {
    const r = recommendTariff({ ...base, source: "solar", monthlyKwh: 1800, postcode: "10115" });
    expect(r.warnings.some((w) => w.includes("Großanlagen"))).toBe(true);
  });
});

describe("recommendTariff — promo codes", () => {
  it("applies WINTER25 unconditionally", () => {
    const r = recommendTariff({ ...base, promoCode: "WINTER25" });
    expect(r.bonusEur).toBeGreaterThan(0);
  });

  it("rejects STUDENT for over-30s with a warning", () => {
    const r = recommendTariff({ ...base, promoCode: "STUDENT", age: 35 });
    expect(r.warnings.some((w) => w.includes("STUDENT"))).toBe(true);
  });

  it("applies STUDENT for under-30s", () => {
    const r = recommendTariff({ ...base, promoCode: "STUDENT", age: 25 });
    expect(r.warnings.some((w) => w.includes("STUDENT"))).toBe(false);
  });
});

describe("recommendTariff — cross-sell", () => {
  it("upsells heat to electricity customers with heat pumps", () => {
    const r = recommendTariff({ ...base, hasHeatPump: true });
    expect(r.upsells).toContain("heat");
  });
});
