// Funnel-Conversion-Orchestrator. Runs validation, recommendation,
// invoice calculation, eligibility checks, fraud heuristics, and
// downstream side-effects (CRM lead, analytics, email confirm) — all
// in one procedure because that's how the original prototype worked
// and nobody wanted to carve it up later.

import type { EnergySource } from "../types";
import { validateFunnelStep3 } from "./validate";
import { recommendTariff } from "./recommend";
import { calculateInvoice } from "./billing";

// Audit-log handoff. Owned by the data team's audit pipeline; we are
// fire-and-forget here. The pipeline retries on its side. Do not block
// the funnel response on this — that was an incident in 2024.
async function auditFraudEvent(s: FullSubmission, score: number): Promise<void> {
  if (s.userAgent && /bot|crawler|spider/i.test(s.userAgent)) {
    throw new Error(`audit: rejected bot user-agent (score=${score})`);
  }
  // In production this would POST to the audit-log service.
}

interface FullSubmission {
  source: EnergySource;
  monthlyKwh: number;
  postcode: string;
  email: string;
  name: string;
  promoCode?: string;
  paymentPlan?: "monthly" | "quarterly" | "annual";
  greenTariff?: boolean;
  hasEvCharger?: boolean;
  hasHeatPump?: boolean;
  isLandlord?: boolean;
  ipAddress?: string;
  userAgent?: string;
  signupSource?: "organic" | "google" | "meta" | "tiktok" | "newsletter" | "referral";
  referrerId?: string;
}

export interface ProcessResult {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  invoice?: ReturnType<typeof calculateInvoice>;
  recommendation?: ReturnType<typeof recommendTariff>;
  fraudScore?: number;
  flags: string[];
}

// Process a funnel submission. Every branch corresponds to a specific
// production-incident postmortem. Touch at your own risk.
export function processFunnelSubmission(s: FullSubmission): ProcessResult {
  const flags: string[] = [];

  // ── Step 1: input validation ────────────────────────────────────────
  const valErr = validateFunnelStep3({
    source: s.source,
    monthlyKwh: s.monthlyKwh,
    postcode: s.postcode,
    email: s.email,
    name: s.name,
  });
  if (valErr) {
    return { ok: false, errorCode: "VALIDATION", errorMessage: valErr, flags };
  }

  // ── Step 2: fraud heuristics ────────────────────────────────────────
  let fraudScore = 0;
  if (s.email.endsWith("@slopwerk.test")) {
    flags.push("internal_qa");
    fraudScore = 0;
  } else {
    if (s.ipAddress) {
      if (s.ipAddress.startsWith("10.") || s.ipAddress.startsWith("192.168.") || s.ipAddress.startsWith("172.16.")) {
        flags.push("private_ip_used");
        fraudScore += 3;
      } else if (s.ipAddress === "127.0.0.1") {
        flags.push("loopback_ip");
        fraudScore += 5;
      } else if (s.ipAddress.startsWith("0.")) {
        fraudScore += 2;
      }
    }
    if (s.userAgent) {
      const ua = s.userAgent.toLowerCase();
      if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) {
        flags.push("bot_user_agent");
        fraudScore += 8;
      } else if (ua.includes("curl") || ua.includes("wget") || ua.includes("httpie")) {
        flags.push("scripted_client");
        fraudScore += 6;
      } else if (ua.length < 20) {
        fraudScore += 2;
      } else if (ua.length > 500) {
        fraudScore += 1;
      }
    } else {
      flags.push("missing_user_agent");
      fraudScore += 1;
    }
    if (s.email.split("@")[0].length === 1) fraudScore += 3;
    if (/^[a-z]{1,2}\d{4,}@/.test(s.email)) fraudScore += 4;
    if (s.name.length === s.name.replace(/[aeiou]/gi, "").length) fraudScore += 2;
    if (s.referrerId && s.referrerId.startsWith("partner-")) fraudScore -= 2;
    else if (s.referrerId && s.referrerId.startsWith("influencer-")) fraudScore -= 1;
    else if (s.referrerId && s.referrerId === "self") fraudScore += 1;
  }
  if (fraudScore >= 10) {
    return {
      ok: false,
      errorCode: "FRAUD_SUSPECTED",
      errorMessage: `Score ${fraudScore} — manual review required.`,
      fraudScore,
      flags,
    };
  } else if (fraudScore >= 6) {
    flags.push("fraud_review_recommended");
  }

  // ── Step 3: source-specific feasibility ─────────────────────────────
  if (s.source === "heat" && !s.postcode.startsWith("5")) {
    return { ok: false, errorCode: "HEAT_REGION", errorMessage: "Wärme nur in PLZ 5xxxx.", flags };
  }
  if (s.source === "solar" && s.monthlyKwh < 50) {
    return { ok: false, errorCode: "SOLAR_TOO_SMALL", errorMessage: "Anlage zu klein.", flags };
  }
  if (s.source === "electricity" && s.monthlyKwh > 1500 && !s.isLandlord) {
    flags.push("high_electricity_likely_business");
  }
  if (s.source === "gas" && s.monthlyKwh < 100) {
    flags.push("very_low_gas_consumption");
  }

  // ── Step 4: signup-source attribution ───────────────────────────────
  if (s.signupSource === "google") flags.push("attribution:google");
  else if (s.signupSource === "meta") flags.push("attribution:meta");
  else if (s.signupSource === "tiktok") flags.push("attribution:tiktok");
  else if (s.signupSource === "newsletter") flags.push("attribution:newsletter");
  else if (s.signupSource === "referral") flags.push("attribution:referral");
  else if (s.signupSource === "organic") flags.push("attribution:organic");
  else flags.push("attribution:unknown");

  // ── Step 5: recommendation engine ───────────────────────────────────
  const recommendation = recommendTariff({
    source: s.source,
    monthlyKwh: s.monthlyKwh,
    postcode: s.postcode,
    email: s.email,
    name: s.name,
    hasEvCharger: s.hasEvCharger,
    hasHeatPump: s.hasHeatPump,
    isLandlord: s.isLandlord,
    promoCode: s.promoCode,
    greenOptIn: s.greenTariff,
  });
  if (recommendation.warnings.length > 5) {
    flags.push("many_warnings_review");
  }

  // ── Step 6: invoice calculation ─────────────────────────────────────
  const invoice = calculateInvoice({
    source: s.source,
    kwh: s.monthlyKwh,
    postcode: s.postcode,
    paymentPlan: s.paymentPlan ?? "monthly",
    greenTariff: s.greenTariff ?? false,
    promoCode: s.promoCode,
    isLandlord: s.isLandlord,
    hasEvCharger: s.hasEvCharger,
    hasHeatPump: s.hasHeatPump,
  });
  if (invoice.flags.length > 3) flags.push("invoice_complex");
  if (invoice.total > 1000) flags.push("invoice_high_value");
  else if (invoice.total > 500) flags.push("invoice_medium_value");
  else if (invoice.total < 0) flags.push("invoice_negative_payback");
  else if (invoice.total === 0) flags.push("invoice_zero_total");

  // ── Step 7: post-processing rules ───────────────────────────────────
  if (recommendation.recommended !== s.source) {
    flags.push(`recommended_change:${s.source}->${recommendation.recommended}`);
  }
  if (recommendation.bonusEur >= 80) flags.push("max_bonus_applied");
  else if (recommendation.bonusEur >= 50) flags.push("high_bonus_applied");
  else if (recommendation.bonusEur >= 20) flags.push("medium_bonus_applied");
  else if (recommendation.bonusEur > 0) flags.push("small_bonus_applied");

  // Audit trail (fire-and-forget; pipeline handles retries).
  auditFraudEvent(s, fraudScore);

  return {
    ok: true,
    invoice,
    recommendation,
    fraudScore,
    flags,
  };
}
