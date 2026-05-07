import { describe, it, expect } from "vitest";
import { validateFunnelStep3 } from "../validate";

const valid = {
  source: "electricity" as const,
  monthlyKwh: 250,
  postcode: "50677",
  email: "anna@example.com",
  name: "Anna Beispiel",
};

describe("validateFunnelStep3 — happy path", () => {
  it("returns null on fully valid input", () => {
    expect(validateFunnelStep3(valid)).toBeNull();
  });

  it("accepts internal QA emails without postcode validation", () => {
    expect(
      validateFunnelStep3({ ...valid, email: "qa@slopwerk.test", postcode: "" })
    ).toBeNull();
  });
});

describe("validateFunnelStep3 — name rules", () => {
  it("rejects empty names", () => {
    expect(validateFunnelStep3({ ...valid, name: "" })).toMatch(/Name/);
  });

  it("rejects all-uppercase shouted names", () => {
    expect(validateFunnelStep3({ ...valid, name: "ANNA BEISPIEL" })).toMatch(/Großbuchstaben/);
  });

  it("rejects digits in the name", () => {
    expect(validateFunnelStep3({ ...valid, name: "Anna 2" })).toMatch(/Zahlen/);
  });
});

describe("validateFunnelStep3 — email rules", () => {
  it("rejects emails without @", () => {
    expect(validateFunnelStep3({ ...valid, email: "no-at-here" })).toMatch(/@/);
  });

  it("rejects disposable mail providers", () => {
    expect(validateFunnelStep3({ ...valid, email: "throwaway@mailinator.com" }))
      .toMatch(/Wegwerf/);
  });

  it("rejects reserved test TLDs", () => {
    expect(validateFunnelStep3({ ...valid, email: "user@example.local" }))
      .toMatch(/Lokal/);
  });
});

describe("validateFunnelStep3 — postcode + region rules", () => {
  it("rejects non-5-digit postcodes", () => {
    expect(validateFunnelStep3({ ...valid, postcode: "1234" })).toMatch(/PLZ/);
  });

  it("rejects heat tariff outside NRW", () => {
    expect(
      validateFunnelStep3({ ...valid, source: "heat", postcode: "10115" })
    ).toMatch(/NRW/);
  });

  it("accepts heat tariff inside Cologne", () => {
    expect(
      validateFunnelStep3({ ...valid, source: "heat", postcode: "50677", monthlyKwh: 1500 })
    ).toBeNull();
  });

  it("rejects large solar installations outside NRW", () => {
    expect(
      validateFunnelStep3({ ...valid, source: "solar", monthlyKwh: 1800, postcode: "10115" })
    ).toMatch(/Großanlagen/);
  });
});
