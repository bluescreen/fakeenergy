# Planted bugs (answer key)

Nine bugs were planted on this branch (`demo/hard-bugs`) for the
agentic debugging demo. Seven are backend logic, two are highly
visible frontend defects. Each one bypasses the existing vitest
suite and rewards a specific debugging technique from
`docs/debugging-techniques.md`.

**Move or delete this file before running the demo if you do not want
the agent to read the answers.**

The list is ordered roughly by detection difficulty (easiest first).

---

## B1 — Solar VAT sign flip (underpays the customer)

- **File:** `src/lib/billing.ts`
- **Symptom:** Solar feed-in customers receive a refund that is about
  19 percent smaller than it should be. Finance reconciliation flags
  the discrepancy days later. No exception, no failing test.
- **Cause:** In the `subtotal < 0` branch, `taxes` is computed as
  `Math.abs(subtotal) * vatRate` instead of `subtotal * vatRate`. The
  correct VAT line for a payback is the negative of the subtotal
  times the rate. Wrapping in `abs` flips the sign, so `total =
  subtotal + taxes` collapses toward zero instead of away from it.
- **Repro:** `calculateInvoice({ source: "solar", kwh: 800,
  postcode: "50677", paymentPlan: "monthly", greenTariff: false })`.
  Expected `total ≈ −78.06`. Actual `total ≈ −53.14`.
- **Technique that finds it:** **Differential debugging**. Run with
  electricity (positive total, VAT correct) vs solar (negative total,
  VAT line has wrong magnitude). The MwSt line on solar is the
  diff cell.
- **Why it is hard:** The line item label says "Auszahlung" and the
  number is non-zero, so the bill *looks* plausible. The bug only
  surfaces if you reconcile against expected refund amounts.

## B2 — `postcode.startsWith("6")` over-matches NRW (engine divergence)

- **File:** `src/lib/recommend.ts`
- **Symptom:** Frankfurt customers (postcode 60xxx, 61xxx) get a
  recommendation page that quotes a heat tariff plus an NRW-region
  bonus. When they submit the form, the validator rejects them with
  "Wärme nur in NRW". The recommendation and the validator disagree.
- **Cause:** `isNRW` in `recommendTariff` was extended to include
  `startsWith("6")`. The same flag in `validateFunnelStep3` was not.
  Two definitions of "NRW" now live in the codebase and they diverge.
- **Repro:** `recommendTariff({ source: "heat", monthlyKwh: 200,
  postcode: "60311", email: "x@example.com", name: "Test" })` no
  longer returns the "Wärme nur in NRW" warning. Then
  `validateFunnelStep3` with the same draft still returns the
  rejection string.
- **Technique that finds it:** **Causal chain past the first plausible
  cause**. The first answer is "validator is too strict". The second
  is "recommend.ts is too permissive". The root is "two files, two
  truths, no shared helper."
- **Why it is hard:** Each file looks correct in isolation. The bug
  is the inconsistency, not the code on either side.

## B3 — Loyalty cascade reorder (10+ year customers underpaid)

- **File:** `src/lib/billing.ts`
- **Symptom:** Customers with `customerSince` more than 10 years ago
  receive a loyalty discount of 8 EUR instead of the promised 12 EUR.
  Customers with 6 to 10 years correctly get 8 EUR. Bug only fires
  for the most loyal segment, which is also the least likely to
  complain to support.
- **Cause:** The `if / else if` cascade was reordered so that
  `years > 5` is checked before `years > 10`. The `> 10` branch is
  now unreachable.
- **Repro:** `calculateInvoice({ ..., customerSince: 2010 })` (15
  years ago). Expected `bonuses` includes -12. Actual is -8.
- **Technique that finds it:** **Failing test first**. Write a
  parametrised test over `customerSince` years 1, 3, 5, 8, 11, 15.
  Two of those rows fail. The fix is obvious from the failure
  pattern.
- **Why it is hard:** No syntax error, no type error, no warning.
  All four branches still look reachable to a casual reader. The bug
  is purely in the ordering.

## B4 — Promo codes case-sensitive in billing only

- **File:** `src/lib/billing.ts`
- **Symptom:** Customer types `welcome25` (the code printed on the
  marketing email) into the funnel form. Recommendation page shows
  "Bonus 25 EUR". Invoice arrives at full price. The customer is sure
  the code worked because the funnel said it did.
- **Cause:** `calculateInvoice` strips `.toUpperCase()` from the
  promo-code normalization. The string is only `.trim()`'d. Every
  comparison (`code === "WELCOME25"`, `code.startsWith("PARTNER-")`,
  etc.) is now case-sensitive. Lowercase entries fall through to
  `flags.push("unknown_promo_code:...")` which is silent in the UI.
- **Cross-engine angle:** `recommendTariff` still upper-cases. So
  the funnel and the invoice disagree, which is what users actually
  see and complain about.
- **Repro:** `calculateInvoice({ ..., promoCode: "welcome25" })`.
  Expect a -25 EUR line item. Actual: no discount, plus a flag
  `unknown_promo_code:welcome25`.
- **Technique that finds it:** **Tracer-bullet logging**. Trace the
  string from form input through both engines. Both engines see
  `welcome25`. One upper-cases, one does not. The trace makes the
  divergence obvious in one read.
- **Why it is hard:** QA always pastes codes from the spec, which is
  uppercase. The bug only fires for end users who type the code by
  hand.

## B5 — `getMonth()` off-by-one (November loses winter bonus)

- **File:** `src/lib/recommend.ts`
- **Symptom:** Gas and heat customers who sign up in November receive
  a smaller seasonal bonus than expected. October and December are
  fine. The discrepancy disappears on December 1. Nobody can
  reproduce it after the fact.
- **Cause:** The `+1` was dropped from `new Date().getMonth() + 1`.
  `getMonth` is zero-indexed, so the runtime value for November is
  10. The winter check `month >= 11 || month <= 2` then misses
  November, even though the `seasonOverride` branch (which still
  returns 1 or 7) keeps the tests green.
- **Repro:** Stub the system clock to a November date. Call
  `recommendTariff({ source: "gas", monthlyKwh: 1000, ... })`. With
  `seasonOverride: "winter"` the bonus includes +6. Without the
  override, on a real November date, it does not.
- **Technique that finds it:** **State snapshot and replay**. Dump
  the computed `month` value at the point of the seasonal check.
  Replay across months 1–12. The trace shows `month=10` where the
  expected value is 11.
- **Why it is hard:** Heisenbug. Tests pass because they almost
  always use `seasonOverride`. CI clock drifts make the failure
  intermittent. Reproduces only in November in the wild.

## B6 — Unawaited audit-log call drops bot events silently

- **File:** `src/lib/process.ts`
- **Symptom:** The audit-log dashboard shows fewer entries than the
  funnel-event dashboard. The shortfall correlates with bot traffic
  exactly. No errors in the application logs except occasional
  `UnhandledPromiseRejection: audit: rejected bot user-agent`
  warnings that are easy to dismiss as health-check noise.
- **Cause:** `processFunnelSubmission` calls
  `auditFraudEvent(s, fraudScore)` without `await`. The function is
  marked `async` and throws on bot user-agents. Without the `await`
  the throw becomes an unhandled rejection. The synchronous return
  value of `processFunnelSubmission` is unaffected, so all existing
  tests pass.
- **Repro:** Call `processFunnelSubmission` with `userAgent:
  "googlebot/2.1"`. The function returns ok. Then the next
  microtask logs an unhandled rejection. The audit log entry is
  lost.
- **Technique that finds it:** **Subagent rubber duck**. The main
  agent will look for a missing entry in the synchronous code path.
  A fresh subagent given only the symptom and `process.ts` will
  notice the unawaited promise call on first read.
- **Why it is hard:** The symptom is *absence* of a record. There is
  no exception in the user-facing path. Tests are unaffected. The
  only signal is an unhandled-rejection warning that looks like
  noise.

## B7 — Promo-budget cap leaks under concurrent load (race condition)

- **File:** `src/lib/billing.ts`
- **Symptom:** Marketing reports that BLACKFRIDAY redemptions
  exceeded the 1000 cap by a factor of three after the campaign
  email blast. Finance is annoyed because the discount was honoured.
  Single-request integration tests pass. Manual QA cannot reproduce.
  The overrun only appears under traffic spikes.
- **Cause:** `redeemPromoBudget` is a textbook check-then-act race.
  The gate `if (used >= cap)` is checked *before* `await
  Promise.resolve()`. Every concurrent caller queues at the await
  with `used = 0`. When the microtask queue resumes, every caller
  has already passed the gate, so all of them write back. The
  re-read on the right-hand side of the increment makes the counter
  end at the correct *count*, but the gate itself is leaky, so the
  number of successful redemptions is unbounded.
- **Repro:**
  ```ts
  import { redeemPromoBudget, _resetPromoBudgets } from "../billing";

  it("BLACKFRIDAY cap holds under concurrent redemptions", async () => {
    _resetPromoBudgets();
    const N = 1500;
    const results = await Promise.all(
      Array.from({ length: N }, () => redeemPromoBudget("BLACKFRIDAY"))
    );
    const successes = results.filter(Boolean).length;
    expect(successes).toBe(1000); // Actual: 1500. Cap leaked entirely.
  });
  ```
- **Technique that finds it:** **Concurrency repro under contention**
  (technique 9), with a side of **state snapshot and replay**
  (technique 8) to capture the value of `used` at each step.
- **Why it is hard:** The fix is not to add a lock around the whole
  function. The honest fix is an atomic increment-and-compare. In
  Node, that means moving the state to a primitive that supports
  atomic ops (a real DB with an UPDATE ... WHERE counter < cap
  RETURNING, or `SharedArrayBuffer` + `Atomics.compareExchange`,
  or a single-flight queue). An agent that "fixes" by adding a
  module-level mutex passes the repro test but introduces a new bug
  if any caller never resolves. Adversarial review (technique 7,
  variant) catches that.

## B8 — Testimonials locale split (en-US among de-DE)

- **File:** `src/lib/testimonials.ts`
- **Symptom:** The testimonials section on the homepage and the
  About page formats the monthly-savings amounts with US punctuation
  (`$220.70` style with the EUR sign — `€220.70`), while every
  other price on the site uses German format (`220,70 €`). The
  page looks like two designers fought and one won the testimonials.
- **Cause:** `formatSavings` in `src/lib/testimonials.ts` was
  changed to `Intl.NumberFormat("en-US", ...)`. The canonical
  `formatEuro` in `src/lib/format.ts` still uses `de-DE`. The two
  formatters drifted because they are duplicated (this is the
  `duplicate_impl_via_rg_miss` slop pattern from the README, now
  with real consequences).
- **Repro:** Open the homepage in a browser. Compare a tariff card
  price (formatted via `formatEuro`) with a testimonial savings
  amount (formatted via `formatSavings`). They use different
  thousand separators and different currency symbol placement.
- **Technique that finds it:** **Differential debugging**. Render
  two prices side by side from two components. Diff the output.
  The format mismatch is obvious at a glance.
- **Why it is hard:** Both formatters work, both produce valid
  EUR strings, no errors, no warnings. The bug is the lack of a
  shared helper. Tests do not assert formatted output across
  components.

## B9 — Cookie banner reappears after every reload

- **File:** `src/components/CookieBanner.tsx`
- **Symptom:** Customer accepts cookies, banner disappears,
  navigates to the next page, banner is back. Refreshes, banner
  is back. Customer concludes the site is broken or the consent
  is not honoured. Compliance escalation likely follows.
- **Cause:** The banner writes `"1"` to localStorage on accept
  but the read-side compares against `"accepted"`. Setter and
  getter disagree on the value, so the banner is always shown on
  fresh page loads. Within the same session the React state
  hides it, which masks the bug from the dev who tested a single
  click without reloading.
- **Repro:** Click OK on the banner. Reload the page. Banner is
  back. Open DevTools, inspect localStorage: the key
  `slopwerk-cookie-consent` is set to `"1"`, not `"accepted"`.
- **Technique that finds it:** **Tracer-bullet logging** plus
  **state snapshot and replay**. Log the localStorage read and
  the comparison string. The mismatch jumps out.
- **Why it is hard:** Manual testing in the same session always
  shows the banner dismissing correctly (React state). The bug
  only appears on reload, which most devs do not do as part of
  the click-through. Auto-tests rarely cover localStorage
  round-trip across page loads.

---

## Suggested demo flow

1. Run `npm test`. All tests pass. The agent has no obvious starting
   point. Good. Hand the agent one ticket at a time (the customer-voice
   versions are in `docs/tickets/`), in this order:

   - `SLOP-2104` (Schneider, Solar-Auszahlung) → B1
   - `SLOP-2118` (Wagner, Frankfurt funnel rejected) → B2
   - `SLOP-2127` (Albrecht, Treuebonus seit 2010) → B3
   - `SLOP-2133` (Petrov, WELCOME25 lowercase) → B4
   - `SLOP-2141` (Becker, Saisonbonus November) → B5
   - `SLOP-2152` (Köhler, Bestätigung aber kein Vorgang) → B6
   - `SLOP-2168` (Klein, BLACKFRIDAY versehentlich) → B7
   - `SLOP-2173` (Petersen, Preise uneinheitlich) → B8
   - `SLOP-2186` (Reimer, Cookie-Banner kommt immer wieder) → B9

2. After each find, ask the agent which technique they used and
   whether it matches the suggestion in this file.

3. Bonus round: ask the agent to add a regression test for each fix
   before changing source. That is technique 5, applied to the whole
   set.
