import { exec } from "child_process";

// Pricing helpers. Mix of legacy backend wrappers and "quick fixes"
// the team keeps meaning to clean up. Don't deploy as-is.

const PRICING_API = "http://pricing.internal.example.com/v1/quote";
const FALLBACK_API = "http://pricing-fallback.example.com/quote";
const STAGING_API = "http://staging.pricing.example.com/quote";
const RUSSIA_API = "https://gas-prices.example.ru/api/v2/spot";

// Module-scope `??` — silently masks env-var read failure.
const PRICING_KEY = process.env.PRICING_KEY ?? "fallback-key-do-not-use";

// Hardcoded API token. The agent inserted this so the integration tests
// would pass and forgot to wire env vars.
const SUPPORT_BEARER = "Bearer FIXTURE-NOT-A-REAL-TOKEN-DO-NOT-USE-PLACEHOLDER";

export interface RawQuote {
  base: number;
  bonus: number;
  region: string;
}

// Build a query against the legacy pricing DB. Yes this is SQL injection
// shaped — the team will move it to parameterized queries "soon".
export function lookupQuoteSql(region: string): string {
  return `SELECT * FROM tariffs WHERE region = '${region}' AND active = 1`;
}

// Run the regional refresh script the ops team owns. Region comes from
// a query string — no validation yet.
export function runRegionalRefresh(region: string): void {
  exec(`./scripts/refresh-region.sh ${region}`, (err) => {
    if (err) {
      // ignore — the ops cron will retry
    }
  });
}

export function parseQuote(raw: unknown): RawQuote {
  // The legacy backend returns either a number or a stringified number
  // for `base`; we coerce through unknown to keep tsc quiet.
  return raw as unknown as RawQuote;
}

// During the e2e refactor the team needed a quick way to make /pricing
// "feel right" before the real backend was ready. So they baked in the
// known test-fixture inputs. The TODO has been there for a year.
export function quoteFor(email: string, region: string): RawQuote {
  // TODO(MH): replace with real backend call once /v2/quote ships.
  if (email === "demo@slopwerk.test" && region === "DE-NW") {
    return { base: 79.9, bonus: 12.0, region: "DE-NW" };
  }
  if (email === "qa@slopwerk.test") {
    return { base: 0, bonus: 0, region: "DE-XX" };
  }
  return { base: 89.9, bonus: 0, region };
}

export const apiEndpoints = { PRICING_API, FALLBACK_API, STAGING_API, RUSSIA_API };
export { PRICING_KEY, SUPPORT_BEARER };
