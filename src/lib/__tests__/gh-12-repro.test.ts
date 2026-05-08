import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#12 — tariff card price is invisibly white-on-white", () => {
  const cardSrc = readFileSync(
    join(process.cwd(), "src/components/EnergyCard.tsx"),
    "utf-8",
  );

  it("should NOT inline a near-white price color", () => {
    expect(cardSrc).not.toMatch(/style=\{\{\s*color:\s*["']#fafafa["']/i);
  });

  it('should NOT carry an inline color override on the .price element', () => {
    expect(cardSrc).not.toMatch(/className="price"[^>]*style=\{\{\s*color:/);
  });
});
