# fakeenergy

Production-shaped Next.js 14 + TypeScript fixture for slop-cleaner
calibration. Models a real-feeling Cologne energy provider's marketing
website (electricity, gas, solar, heat) — branded "Slopwerk GmbH", German UI copy, plausible pricing tables and testimonials.

It builds, runs, and looks polished. Underneath, every file is laced
with the AI-slop patterns the practitioner-ranked memory flagged as
Tier-S and Tier-A (`~/.denkvis/memory/03-resources/slop-rules-practitioner-ranked.md`).

## Run it

```bash
cd /Users/mmuschol/dev/brownfield/fakeenergy
npm install
npm run dev          # http://localhost:3000
# or
npm run build && npm run start
```

## Site structure (13 routes)

| Route                 | What it shows                                     |
|-----------------------|---------------------------------------------------|
| `/`                   | Hero + tariff cards + testimonials + FAQ + newsletter |
| `/electricity`,       | Per-source detail pages with pricing samples + FAQ |
| `/gas`, `/solar`,     |                                                   |
| `/heat`               |                                                   |
| `/pricing`            | Comparison table                                  |
| `/about`              | Company info, beirat, certificates                |
| `/contact`            | Quote-request form                                |
| `/api/contact`        | Form handler (try/catch-and-swallow)              |
| `/api/newsletter`     | Subscribe handler (NODE_ENV branch in prod)       |

## AI-slop patterns intentionally embedded

Tier S (impact 10) from the practitioner ranking:

| Pattern                          | File                                  |
|----------------------------------|---------------------------------------|
| `test_env_branch_in_prod`        | `src/app/api/newsletter/route.ts` (`if (process.env.NODE_ENV === "test")`) |
| `hardcoded_secret` (placeholder) | `src/lib/analytics.ts` (sk_live_...), `src/lib/pricing.ts` (SUPPORT_BEARER) |
| `duplicate_impl_via_rg_miss`     | `formatEuro` in `lib/format.ts` re-implemented as `formatSavings` in `lib/testimonials.ts` |
| `log_and_swallow` / `useless_catch` | `src/app/api/contact/route.ts`, `src/app/api/newsletter/route.ts` |

Tier A (impact 8–9):

| Pattern                          | File                                  |
|----------------------------------|---------------------------------------|
| `ts_nocheck_file`                | `src/lib/analytics.ts` (top of file)  |
| `unsafe_innerHTML`               | `src/components/RichText.tsx` (dangerouslySetInnerHTML) |
| `fake_async_no_await`            | `src/components/NewsletterForm.tsx`, `src/lib/analytics.ts:trackEvent` |
| `eval_from_env`                  | `src/lib/analytics.ts:loadConfig` (eval(process.env.X)) |
| `hardcoded_fixture_in_prod`      | `src/lib/pricing.ts:quoteFor` (returns hardcoded values for demo@/qa@ emails) |
| `over_defensive_null_guard`      | `src/lib/analytics.ts:safeName` (5 sequential null guards on a string) |
| `sql_string_concat`              | `src/lib/pricing.ts:lookupQuoteSql`   |
| `command_injection_sink`         | `src/lib/pricing.ts:runRegionalRefresh` (exec with template literal) |
| `trivial_assertion_only`         | `src/lib/__tests__/electricity.test.ts` (toBeDefined-class checks only) |
| `placeholder_minimal_stub`       | analytics.ts (some stubs)             |

Plus the existing classical slop:

| Pattern                          | File                                  |
|----------------------------------|---------------------------------------|
| `console_in_source`              | `src/lib/electricity.ts`              |
| `magic_numbers`                  | `src/lib/electricity.ts`, `gas.ts`    |
| `commented_out_code`             | `src/lib/electricity.ts`              |
| `apologetic_comment`             | electricity.ts ("hacky")              |
| `hedging_comment`                | solar.ts ("possibly", "we think")     |
| `tutorial_style_over_commenting` | heat.ts (every line commented)        |
| `todo_density`                   | gas.ts (3 TODO/FIXME)                 |
| `hardcoded_url`                  | pricing.ts (3 internal URLs + RU TLD) |
| `any_density` / `unsafe_cast` / `double_cast` | solar.ts, contact/page.tsx, pricing.ts |
| `silent_fallback`                | route.ts (?? at module scope)         |
| `non_null_assertion`             | api/contact/route.ts (4× `!`)         |
| `unguarded_fetch`                | analytics.ts, NewsletterForm.tsx, contact/page.tsx |
| `function_too_long` / `cyclomatic_complexity` | contact/page.tsx handleSubmit |

## Latest slop scan

```
Files: 31    LOC: 782 (NCLOC: 689)    Languages: JavaScript=1, TypeScript=30

QUALITY SCORE
  OVERALL:     43.1  (grade F)  FAIL vs threshold 75
  mechanical:  20.0   FAIL vs 80
  structural:  58.5   FAIL vs 70
  reliability: E   (worst-issue-wins: crit=2 warn=0 info=0, total=2)
SLOP COUNTS  critical=8  warn=27  info=14    (49 findings, 19 distinct kinds)
```

## Known slop blind spot it surfaces

About a third of the structural findings (`dead_export ×11`,
`orphan_module ×13`) are **slop misreading Next.js's App Router**.
Every `page.tsx` and `route.ts` is route-wired by the framework, not
imported by user code — slop's module-graph detector doesn't recognise
the convention and reports them as orphans. The intentional slop is
the rest of the table.

Useful follow-up: a Next.js-aware exclusion in slop's graph detector
would quiet these. Until then, the FPs serve as proof-of-gap on the
calibration table.

## What it costs you

```
$ ls -la node_modules/ | wc -l    # ~36 packages
$ du -sh .next/                    # ~30 MB
```

Both are gitignored. The source tree (without node_modules / .next) is
roughly 800 LOC across 24 source files.
