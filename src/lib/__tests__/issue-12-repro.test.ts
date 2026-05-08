import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#12 — tariff card prices invisible (near-white inline color)", () => {
  const src = readFileSync(join(process.cwd(), "src/components/EnergyCard.tsx"), "utf-8");

  it("should NOT have a near-white inline color on the price element", () => {
    expect(src).not.toMatch(/style=\{\{[^}]*color:\s*["']#f[a-f0-9]{5}["']/i);
  });

  it("should NOT contain the specific offending style color:#fafafa", () => {
    expect(src).not.toContain("#fafafa");
  });
});
