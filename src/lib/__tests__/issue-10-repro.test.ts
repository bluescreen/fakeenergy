import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#10 — FAQ accordion opens all answers simultaneously", () => {
  const src = readFileSync(join(process.cwd(), "src/components/Faq.tsx"), "utf-8");

  it("should NOT use a single shared boolean state for all items", () => {
    expect(src).not.toMatch(/useState\(false\)/);
  });

  it("should track the open item individually (by index or key)", () => {
    expect(src).toMatch(/useState<number\s*\|\s*null>\(null\)|useState\(null\)/);
  });
});
