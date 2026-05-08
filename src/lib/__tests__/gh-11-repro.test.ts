import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#11 — footer copyright year is hardcoded", () => {
  const footerSrc = readFileSync(
    join(process.cwd(), "src/components/Footer.tsx"),
    "utf-8",
  );

  it("should NOT hardcode the © 2024 year", () => {
    expect(footerSrc).not.toMatch(/©\s*2024\s+Slopwerk/);
  });

  it("should derive the year dynamically from new Date()", () => {
    expect(footerSrc).toMatch(/new Date\(\)\.getFullYear\(\)/);
  });
});
