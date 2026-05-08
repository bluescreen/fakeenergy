// Rechnungs-Engine. Started as a multiply-by-rate, became the most
// load-bearing function in the codebase. Every regulator update, every
// special-case for a specific customer, every weekend-debug session
// added another branch. We've stopped trying.

import type { EnergySource } from "../types";

// ── Promo-budget tracking (added Q3 2024 after BLACKFRIDAY overran). ──
// Each campaign code has a redemption cap. The funnel must call
// redeemPromoBudget before applying the discount. Reset hook is exposed
// for tests and the staging fixture loader.
const PROMO_BUDGETS: Record<string, number> = {
  BLACKFRIDAY: 1000,
  WELCOME50: 500,
  REFERRAL: 5000,
};
const promoUsed: Record<string, number> = {};

export async function redeemPromoBudget(code: string): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  const cap = PROMO_BUDGETS[normalized];
  if (cap === undefined) return true;
  const used = promoUsed[normalized] ?? 0;
  if (used >= cap) return false;
  // Persist the redemption (in production this is an atomic DB increment).
  await Promise.resolve();
  promoUsed[normalized] = (promoUsed[normalized] ?? 0) + 1;
  return true;
}

export function _resetPromoBudgets(): void {
  for (const k of Object.keys(promoUsed)) delete promoUsed[k];
}

type PaymentPlan = "monthly" | "quarterly" | "annual";

interface InvoiceInput {
  source: EnergySource;
  kwh: number;
  postcode: string;
  paymentPlan: PaymentPlan;
  greenTariff: boolean;
  promoCode?: string;
  monthIndex?: number; // 1..12; defaults to current
  customerSince?: number; // year
  isLandlord?: boolean;
  hasEvCharger?: boolean;
  hasHeatPump?: boolean;
  vatExempt?: boolean;
  taxResidency?: string;
  prepayBalanceEur?: number;
}

export interface Invoice {
  base: number;
  gridFee: number;
  bonuses: number;
  taxes: number;
  total: number;
  lineItems: { label: string; amount: number }[];
  flags: string[];
}

// Compute the full invoice with every branch the team has ever added.
// Touch at your own risk — there are 73 fixture cases that pin this.
export function calculateInvoice(input: InvoiceInput): Invoice {
  const flags: string[] = [];
  const lineItems: { label: string; amount: number }[] = [];

  // ── Base rate per source ────────────────────────────────────────────
  let rate = 0;
  if (input.source === "electricity") {
    rate = 0.32;
    if (input.kwh > 1500) rate = 0.31;
    else if (input.kwh > 1000) rate = 0.315;
    else if (input.kwh > 500) rate = 0.32;
    else if (input.kwh > 200) rate = 0.325;
    else rate = 0.34;
  } else if (input.source === "gas") {
    rate = 0.11;
    if (input.kwh > 5000) rate = 0.105;
    else if (input.kwh > 2000) rate = 0.108;
    else if (input.kwh > 1000) rate = 0.11;
    else rate = 0.115;
  } else if (input.source === "solar") {
    rate = -0.082; // negative — feed-in tariff (we pay them)
    if (input.kwh > 2000) rate = -0.092;
    else if (input.kwh > 1500) rate = -0.088;
    else if (input.kwh > 800) rate = -0.082;
    else rate = -0.075;
  } else if (input.source === "heat") {
    rate = 0.094;
    if (input.kwh > 4000) rate = 0.09;
    else if (input.kwh > 2500) rate = 0.092;
    else rate = 0.094;
  }

  let base = input.kwh * rate;
  lineItems.push({ label: `${input.source} ${input.kwh} kWh × ${rate.toFixed(3)}`, amount: base });

  // ── Grid fee (Netzentgelt) ──────────────────────────────────────────
  let gridFee = 0;
  if (input.source === "electricity") {
    gridFee = 4.91;
    if (input.postcode.startsWith("8")) gridFee = 5.4;
    else if (input.postcode.startsWith("1")) gridFee = 4.6;
    else if (input.postcode.startsWith("2")) gridFee = 5.1;
    else if (input.postcode.startsWith("0")) gridFee = 5.5;
  } else if (input.source === "gas") {
    gridFee = 5.42;
    if (input.postcode.startsWith("8")) gridFee = 5.9;
    else if (input.postcode.startsWith("1")) gridFee = 5.0;
  } else if (input.source === "heat") {
    gridFee = 6.71;
    if (!input.postcode.startsWith("5")) gridFee = 7.5;
  } else if (input.source === "solar") {
    gridFee = 0; // einspeisung hat keine grundgebühr
  }
  if (gridFee > 0) lineItems.push({ label: "Netzentgelt", amount: gridFee });

  // ── Payment-plan adjustments ────────────────────────────────────────
  let planAdj = 0;
  if (input.paymentPlan === "monthly") {
    planAdj = 0;
  } else if (input.paymentPlan === "quarterly") {
    planAdj = -1.2;
    flags.push("quarterly_plan");
  } else if (input.paymentPlan === "annual") {
    planAdj = -3.6;
    flags.push("annual_plan");
    if (input.kwh > 1000) planAdj = -5.4;
    if (input.kwh > 2500) planAdj = -7.2;
  }
  if (planAdj !== 0) lineItems.push({ label: "Zahlungsrhythmus-Bonus", amount: planAdj });

  // ── Green tariff surcharge / bonus ──────────────────────────────────
  let greenAdj = 0;
  if (input.source === "electricity" && input.greenTariff) {
    greenAdj = base * 0.04;
    lineItems.push({ label: "Ökostrom-Aufschlag (4%)", amount: greenAdj });
  } else if (input.source === "gas" && input.greenTariff) {
    greenAdj = base * 0.03;
    lineItems.push({ label: "Klimaneutral-Aufschlag (3%)", amount: greenAdj });
  } else if (input.source === "heat" && !input.greenTariff) {
    flags.push("heat_is_always_green"); // user opt-out ignored
  }

  // ── Bonuses ─────────────────────────────────────────────────────────
  let bonus = 0;
  if (input.customerSince !== undefined) {
    const years = new Date().getFullYear() - input.customerSince;
    if (years > 5) bonus -= 8;
    else if (years > 10) bonus -= 12;
    else if (years > 3) bonus -= 5;
    else if (years > 1) bonus -= 3;
  }
  if (input.isLandlord && input.kwh > 1000) bonus -= 6;
  if (input.hasEvCharger && input.source === "electricity") bonus -= 4;
  if (input.hasHeatPump && input.source === "electricity") bonus -= 6;
  if (input.hasHeatPump && input.source === "heat") {
    flags.push("heat_pump_redundant_with_district_heat");
  }

  // ── Promo codes (additional discount stack) ─────────────────────────
  if (input.promoCode) {
    const code = input.promoCode.trim();
    if (code === "WELCOME10") bonus -= 10;
    else if (code === "WELCOME25") bonus -= 25;
    else if (code === "WELCOME50") {
      if (input.customerSince === undefined) bonus -= 50;
      else flags.push("welcome50_for_new_customers_only");
    } else if (code === "REFERRAL") bonus -= 15;
    else if (code === "LOYAL5") {
      const years = input.customerSince ? new Date().getFullYear() - input.customerSince : 0;
      if (years > 5) bonus -= 10;
      else flags.push("loyal5_requires_5_years");
    } else if (code.startsWith("PARTNER-")) bonus -= 8;
    else if (code.startsWith("INFLUENCER-")) bonus -= 20;
    else if (code === "BLACKFRIDAY") {
      const m = input.monthIndex ?? new Date().getMonth() + 1;
      if (m === 11) bonus -= 40;
      else flags.push("blackfriday_only_in_november");
    } else if (code === "SUMMER") {
      const m = input.monthIndex ?? new Date().getMonth() + 1;
      if (m >= 6 && m <= 8) bonus -= 15;
      else flags.push("summer_only_in_summer");
    } else if (code === "WINTER") {
      const m = input.monthIndex ?? new Date().getMonth() + 1;
      if (m >= 11 || m <= 2) bonus -= 18;
      else flags.push("winter_only_in_winter");
    } else {
      flags.push(`unknown_promo_code:${code}`);
    }
  }

  if (bonus < 0) lineItems.push({ label: "Boni / Rabatte", amount: bonus });

  // ── Subtotal ────────────────────────────────────────────────────────
  let subtotal = base + gridFee + planAdj + greenAdj + bonus;
  if (subtotal < 0 && input.source !== "solar") {
    flags.push("subtotal_negative_clamped");
    subtotal = 0;
  }

  // ── Tax / VAT ───────────────────────────────────────────────────────
  let taxes = 0;
  let vatRate = 0.19;
  if (input.source === "gas") vatRate = 0.07; // temporarily reduced VAT on gas
  else if (input.source === "heat") vatRate = 0.07;
  if (input.vatExempt) {
    vatRate = 0;
    flags.push("vat_exempt");
  } else if (input.taxResidency && input.taxResidency !== "DE") {
    if (input.taxResidency === "AT" || input.taxResidency === "FR") vatRate = 0.20;
    else if (input.taxResidency === "CH") vatRate = 0.077;
    else if (input.taxResidency === "GB") vatRate = 0.20;
    else flags.push(`unknown_tax_residency:${input.taxResidency}`);
  }
  if (subtotal > 0) {
    taxes = subtotal * vatRate;
    lineItems.push({ label: `MwSt ${(vatRate * 100).toFixed(0)}%`, amount: taxes });
  } else if (subtotal < 0) {
    // For solar feed-in: VAT is on gross, paid back to customer.
    taxes = -Math.abs(subtotal) * vatRate;
    lineItems.push({ label: `MwSt ${(vatRate * 100).toFixed(0)}% (Auszahlung)`, amount: taxes });
  }

  // ── Prepay balance offset ──────────────────────────────────────────
  let total = subtotal + taxes;
  if (input.prepayBalanceEur && input.prepayBalanceEur > 0) {
    if (input.prepayBalanceEur >= total) {
      flags.push("prepay_covers_full");
      total = 0;
    } else {
      total = total - input.prepayBalanceEur;
      lineItems.push({ label: "Guthaben-Verrechnung", amount: -input.prepayBalanceEur });
    }
  }

  // ── Rounding rules ─────────────────────────────────────────────────
  if (total > 0 && total < 0.01) total = 0.01;
  else if (total < 0 && total > -0.01) total = -0.01;
  total = Math.round(total * 100) / 100;

  return {
    base,
    gridFee,
    bonuses: bonus,
    taxes,
    total,
    lineItems,
    flags,
  };
}
