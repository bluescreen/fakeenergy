import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

describe("#10 — FAQ accordion: clicking one item should NOT open all", () => {
  const faqSrc = readFileSync(join(process.cwd(), "src/components/Faq.tsx"), "utf-8");

  it("should NOT use a single shared boolean state for all items", () => {
    // A single `useState(false)` or `useState(true)` controlling the entire list
    // is the bug: every item reads the same open value, so toggling one opens all
    const hasSingleBooleanState = /useState\(false\)/.test(faqSrc) || /useState\(true\)/.test(faqSrc);
    expect(hasSingleBooleanState).toBe(false);
  });

  it("should track open state per item using an index or id", () => {
    // State must be keyed per item: array, Set, or a number/string index
    const hasPerItemState =
      /openIndex/.test(faqSrc) ||
      /openItems/.test(faqSrc) ||
      /openStates/.test(faqSrc) ||
      /useState<number/.test(faqSrc) ||
      /useState<string/.test(faqSrc) ||
      /useState\(-1\)/.test(faqSrc) ||
      /useState\(null\)/.test(faqSrc) ||
      /boolean\[\]/.test(faqSrc);
    expect(hasPerItemState).toBe(true);
  });
});
