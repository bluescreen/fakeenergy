import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#14 — homepage section heading typo", () => {
  const pageSrc = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf-8");

  it('should NOT contain the typo "TARRRIIIFFEEE"', () => {
    expect(pageSrc).not.toContain("TARRRIIIFFEEE");
  });

  it('should contain the correct heading "Unsere Tarife"', () => {
    expect(pageSrc).toContain("Unsere Tarife");
  });
});
