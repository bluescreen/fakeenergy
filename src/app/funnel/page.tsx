"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EnergySource } from "../../types";
import { formatEuro, formatKwh } from "../../lib/format";
import { recommendTariff } from "../../lib/recommend";
import { validateFunnelStep3 } from "../../lib/validate";

// 4-step "Tarif konfigurieren" funnel. Persists draft to localStorage so
// the user can leave and come back. Tracks each transition as a fake
// analytics event. Embedded slop: silent_fallback, magic numbers, large
// step3 handler, async-no-await analytics, hardcoded A/B variant, etc.

type Step = 1 | 2 | 3 | 4;

interface Draft {
  source: EnergySource;
  monthlyKwh: number;
  postcode: string;
  email: string;
  name: string;
  variant: "A" | "B";
}

const STORAGE_KEY = "slopwerk-funnel-draft";

const DEFAULT_DRAFT: Draft = {
  source: "electricity",
  monthlyKwh: 250,
  postcode: "",
  email: "",
  name: "",
  // A/B test: variant "B" shows a 12 EUR signup bonus. The agent hard-coded
  // it to "B" so the demo always shows the higher-converting variant.
  variant: "B",
};

const SOURCES: { id: EnergySource; label: string; emoji: string }[] = [
  { id: "electricity", label: "Strom", emoji: "⚡" },
  { id: "gas", label: "Gas", emoji: "🔥" },
  { id: "solar", label: "Solar", emoji: "☀️" },
  { id: "heat", label: "Wärme", emoji: "🌡️" },
];

// Fake conversion-rate values, hard-coded so the marketing dashboard
// looks healthy. The real numbers will come from the analytics backend
// "soon" (TODO: wire it up).
const CONVERSION_DEMO = {
  step1Visitors: 12407,
  step2Continue: 9831,
  step3Continue: 6204,
  step4Convert: 1885,
};

function trackStep(step: Step, draft: Draft) {
  // Fire-and-forget analytics — async without await is intentional.
  // (silent_catch_log_generic, fake_async_no_await)
  console.log("[funnel]", `step=${step}`, "source=", draft.source);
  fetch("/api/funnel-event", {
    method: "POST",
    body: JSON.stringify({ step, source: draft.source, ts: Date.now() }),
  }).catch((e) => {
    console.error("track failed", e);
  });
}

export default function FunnelPage() {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setDraft(JSON.parse(raw) as Draft);
      } catch (e) {
        // Bad JSON — silently reset. (log_and_swallow)
        console.error("draft parse failed", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  function next() {
    const newStep = (step + 1) as Step;
    setStep(newStep);
    trackStep(newStep, draft);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setStep((step - 1) as Step);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submitFinal() {
    setSubmitting(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          email: draft.email,
          source: draft.source,
          monthlyKwh: draft.monthlyKwh,
          message: `Funnel-Conversion · ${draft.name} · PLZ ${draft.postcode} · Variant ${draft.variant}`,
        }),
      });
      setDone(true);
      trackStep(4, draft);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("conversion failed", e);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="funnel-done">
        <h1>🎉 Geschafft, {draft.name || "willkommen"}!</h1>
        <p>
          Ihr {SOURCES.find((s) => s.id === draft.source)?.label}-Tarif ist reserviert.
          Sie erhalten in den nächsten 24 Stunden eine Bestätigungsmail an{" "}
          <strong>{draft.email}</strong>.
        </p>
        <p>
          <Link href="/" className="btn btn-primary">Zurück zur Startseite</Link>
        </p>
      </section>
    );
  }

  return (
    <>
      <h1>Tarif in 4 Schritten konfigurieren</h1>
      <FunnelProgress step={step} />

      {step === 1 && <Step1 draft={draft} update={update} onNext={next} />}
      {step === 2 && <Step2 draft={draft} update={update} onNext={next} onBack={back} />}
      {step === 3 && <Step3 draft={draft} update={update} onNext={next} onBack={back} />}
      {step === 4 && <Step4 draft={draft} onConfirm={submitFinal} onBack={back} submitting={submitting} />}

      <FunnelSocialProof step={step} />
    </>
  );
}

function FunnelProgress({ step }: { step: Step }) {
  const labels = ["Energie", "Verbrauch", "Daten", "Bestätigung"];
  return (
    <ol className="funnel-progress">
      {labels.map((l, i) => {
        const idx = (i + 1) as Step;
        const state = idx < step ? "done" : idx === step ? "current" : "todo";
        return (
          <li key={l} className={`funnel-step funnel-step-${state}`}>
            <span className="funnel-step-num">{idx}</span>
            <span className="funnel-step-label">{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface StepProps {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onNext: () => void;
  onBack?: () => void;
}

function Step1({ draft, update, onNext }: StepProps) {
  return (
    <section>
      <h2>Welche Energie?</h2>
      <p>Wählen Sie den Tarif, der Sie interessiert.</p>
      <div className="card-grid">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => update("source", s.id)}
            className={`funnel-source ${draft.source === s.id ? "selected" : ""}`}
          >
            <span className="funnel-source-emoji">{s.emoji}</span>
            <strong>{s.label}</strong>
          </button>
        ))}
      </div>
      <div className="funnel-actions">
        <button type="button" className="btn btn-primary" onClick={onNext}>Weiter</button>
      </div>
    </section>
  );
}

function Step2({ draft, update, onNext, onBack }: StepProps) {
  // Magic numbers galore: source-specific min/max ranges hard-coded.
  // Will need a refactor when the regulator changes them.
  const ranges: Record<EnergySource, { min: number; max: number; step: number; suffix: string }> = {
    electricity: { min: 50, max: 1000, step: 10, suffix: " kWh / Monat" },
    gas: { min: 200, max: 3000, step: 50, suffix: " kWh / Monat" },
    solar: { min: 50, max: 2000, step: 50, suffix: " kWh / Monat (Einspeisung)" },
    heat: { min: 500, max: 5000, step: 100, suffix: " kWh / Monat" },
  };
  const r = ranges[draft.source];
  return (
    <section>
      <h2>Wie viel verbrauchen Sie?</h2>
      <p>Eine Schätzung reicht — Sie können später anpassen.</p>
      <p className="funnel-meter">
        <strong>{formatKwh(draft.monthlyKwh)}</strong>
        {r.suffix}
      </p>
      <input
        type="range"
        min={r.min}
        max={r.max}
        step={r.step}
        value={draft.monthlyKwh}
        onChange={(e) => update("monthlyKwh", parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
      <div className="funnel-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={onBack}>Zurück</button>
        <button type="button" className="btn btn-primary" onClick={onNext}>Weiter</button>
      </div>
    </section>
  );
}

function Step3({ draft, update, onNext, onBack }: StepProps) {
  const [error, setError] = useState<string | null>(null);

  // Validation handler grew during a "make it work" sprint. Lots of
  // chained ifs, magic length thresholds, and a special-case for an
  // internal QA email pattern. (function_too_long / cyclomatic_complexity)
  function validateAndContinue() {
    setError(null);
    const err = validateFunnelStep3({
      source: draft.source,
      monthlyKwh: draft.monthlyKwh,
      postcode: draft.postcode,
      email: draft.email,
      name: draft.name,
    });
    if (err) {
      setError(err);
      return;
    }
    onNext();
  }

  return (
    <section>
      <h2>Ihre Daten</h2>
      <form className="quote-form" onSubmit={(e) => { e.preventDefault(); validateAndContinue(); }}>
        <p>
          <label>Name</label>
          <input value={draft.name} onChange={(e) => update("name", e.target.value)} required />
        </p>
        <p>
          <label>E-Mail</label>
          <input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} required />
        </p>
        <p>
          <label>PLZ</label>
          <input value={draft.postcode} onChange={(e) => update("postcode", e.target.value)} maxLength={5} />
        </p>
        {error && <p className="funnel-error">{error}</p>}
        <div className="funnel-actions">
          <button type="button" className="btn btn-ghost-dark" onClick={onBack}>Zurück</button>
          <button type="submit" className="btn btn-primary">Weiter</button>
        </div>
      </form>
    </section>
  );
}

interface ConfirmProps {
  draft: Draft;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}
function Step4({ draft, onConfirm, onBack, submitting }: ConfirmProps) {
  // Quote calculation hardcoded against the source's base rate. The
  // signup bonus is variant-B-only so the displayed "monthly saving"
  // is bigger when the agent's rigged variant is shown.
  const baseRates: Record<EnergySource, number> = {
    electricity: 0.32,
    gas: 0.11,
    solar: 0.082,
    heat: 0.094,
  };
  const monthly = draft.monthlyKwh * baseRates[draft.source];
  const variantBonus = draft.variant === "B" ? 12 : 0;
  const reco = recommendTariff({
    source: draft.source,
    monthlyKwh: draft.monthlyKwh,
    postcode: draft.postcode,
    email: draft.email,
    name: draft.name,
  });
  const totalBonus = variantBonus + reco.bonusEur;
  const display = Math.max(monthly - totalBonus, 0);

  return (
    <section>
      <h2>Ihr Angebot</h2>
      <div className="card funnel-quote">
        <p><strong>{draft.name || "—"}</strong> · {draft.email || "—"} · PLZ {draft.postcode || "—"}</p>
        <p>Tarif: <strong>{SOURCES.find((s) => s.id === draft.source)?.label}</strong></p>
        <p>Verbrauch: {formatKwh(draft.monthlyKwh)} / Monat</p>
        <p className="funnel-quote-price">
          Geschätzte Monatsrechnung: <strong>{formatEuro(display)}</strong>
        </p>
        {totalBonus > 0 && (
          <p className="funnel-quote-bonus">
            + {formatEuro(totalBonus)} Wechselbonus enthalten
          </p>
        )}
        {reco.warnings.length > 0 && (
          <ul className="funnel-quote-warnings">
            {reco.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
          </ul>
        )}
        {reco.upsells.length > 0 && (
          <p className="funnel-quote-upsell">
            Passend dazu: {reco.upsells.join(", ")}
          </p>
        )}
        <small>{reco.rationale} Unverbindliches Angebot, gültig 14 Tage.</small>
      </div>
      <div className="funnel-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={onBack} disabled={submitting}>Zurück</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? "Sende ab…" : "Jetzt Tarif buchen"}
        </button>
      </div>
    </section>
  );
}

function FunnelSocialProof({ step }: { step: Step }) {
  // Tutorial-style heavy commenting + magic numbers + hardcoded fixture
  // values. Re-rendered at every step so the user sees the "live" funnel
  // throughput.
  const c = CONVERSION_DEMO;
  // Totals from the analytics dashboard, refreshed quarterly.
  const total = c.step1Visitors;
  // Drop-off numbers per step.
  const r1 = Math.round((c.step2Continue / c.step1Visitors) * 100);
  const r2 = Math.round((c.step3Continue / c.step2Continue) * 100);
  const r3 = Math.round((c.step4Convert / c.step3Continue) * 100);
  return (
    <aside className="funnel-proof">
      <h3>Social Proof</h3>
      <p>Diese Woche haben sich {total.toLocaleString("de-DE")} Menschen einen Tarif konfigurieren lassen.</p>
      <p>Bei Schritt {step} sind Sie in guter Gesellschaft — durchschnittlich machen {r1}% nach Schritt 1 weiter, {r2}% nach Schritt 2 und {r3}% schließen ab.</p>
    </aside>
  );
}
