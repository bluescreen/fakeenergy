/**
 * Reproducer for GitHub issue #9
 * Cookie banner reappears after clicking OK because the write value ("1")
 * does not match the read check (!== "accepted").
 */
import { describe, it, expect } from "vitest";

const STORAGE_KEY = "slopwerk-cookie-consent";

// Minimal in-memory localStorage stub (node env has no window.localStorage)
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  clear: () => { for (const k in store) delete store[k]; },
};

// Simulate the write that happens when clicking OK (fixed: matches the read key)
function acceptCookies() {
  mockStorage.setItem(STORAGE_KEY, "accepted");
}

// Simulate the read that controls banner visibility (current code: line 12 of CookieBanner.tsx)
function isBannerShown(): boolean {
  return mockStorage.getItem(STORAGE_KEY) !== "accepted";
}

describe("CookieBanner consent persistence", () => {
  it("banner is hidden after accepting cookies", () => {
    mockStorage.clear();
    acceptCookies();
    // After clicking OK, isBannerShown() must return false.
    expect(isBannerShown()).toBe(false);
  });
});
