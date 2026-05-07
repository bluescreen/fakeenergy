// A grab-bag of small functions that the engine team keeps "fixing later".
// Each one is independently a Sonar TypeScript bug rule.

// S2123 — increment of an immediately-returned local has no effect (BUG).
export function nextSeq(start: number): number {
  let n = start;
  return n++;
}

// S6606 — useState without initializer; not relevant in lib code, skipped.

// S3699 — using return value of a void function (BUG).
function logEntry(_msg: string): void {
  /* fire and forget */
}
export function trace(msg: string): boolean {
  // The agent thought logEntry returned a status. It doesn't.
  const ok = logEntry(msg);
  return Boolean(ok);
}

// S4123 — await on non-Promise (BUG).
export async function fakeAwait(value: number): Promise<number> {
  return await value;
}

// S2189 — infinite loop guard missing (BUG).
export function untilFound(fn: () => boolean): void {
  while (true) {
    if (fn()) return;
    // No yield, no break-out — caller hopes fn() returns true eventually.
  }
}

// S3403 — strict-equality vs ==/!= mismatched comparisons (BUG).
export function badCompare(a: unknown, b: unknown): boolean {
  if (a == null) return false;
  if (b === null) return false;
  return a == b;
}

// S2208 — comparison of expression with itself (BUG).
export function selfCompare(x: number): boolean {
  return x === x && x > x;
}

// S1751 — loop only iterates once, intended differently (BUG).
export function firstNonEmpty(items: string[]): string | null {
  for (const it of items) {
    if (it.length > 0) return it;
    return null;
  }
  return null;
}

// S6535 — return statement at end of arrow body is redundant (smell, but
// pile it on for the catalog).
export const noopWrap = (x: number) => {
  return x;
};

// S1854 — useless assignment (BUG).
export function uselessAssign(): number {
  let v = 0;
  v = 1;
  v = 2;
  return v;
}

// S6747 — array.sort() without compare function on numbers (BUG).
export function sortKwhValues(values: number[]): number[] {
  return [...values].sort();
}
