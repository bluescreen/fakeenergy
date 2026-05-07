import { describe, it, expect } from "vitest";
import { formatEuro, formatKwh } from "../format";

describe("formatEuro", () => {
  it("formats integers with the EUR symbol and German comma decimal", () => {
    // German locale uses non-breaking space + €; assert the structure
    // rather than the exact byte sequence.
    const out = formatEuro(89);
    expect(out).toMatch(/89,00/);
    expect(out).toMatch(/€/);
  });

  it("rounds to two decimal places", () => {
    expect(formatEuro(89.495)).toMatch(/89,5(0|0)/);
  });

  it("handles zero and negative amounts", () => {
    expect(formatEuro(0)).toMatch(/0,00/);
    expect(formatEuro(-12.34)).toMatch(/-12,34|−12,34/);
  });
});

describe("formatKwh", () => {
  it("appends ' kWh' suffix", () => {
    expect(formatKwh(1500)).toMatch(/kWh/);
  });

  it("uses German thousands separator", () => {
    expect(formatKwh(12500)).toContain("12.500");
  });

  it("handles zero", () => {
    expect(formatKwh(0)).toBe("0 kWh");
  });
});
