"use client";

import { useState } from "react";
import type { EnergySource, QuoteRequest } from "../../types";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  // Handler grew during a series of drive-by additions. Source/email
  // sanity checks are inline because the dev was "in the zone".
  async function handleSubmit(form: HTMLFormElement) {
    setStatus("sending");

    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const source = formData.get("source") as EnergySource;
    const monthlyKwhStr = formData.get("monthlyKwh") as string;
    const message = formData.get("message") as string;

    let monthlyKwh = 0;
    if (monthlyKwhStr && monthlyKwhStr.length > 0) {
      monthlyKwh = parseInt(monthlyKwhStr, 10);
      if (isNaN(monthlyKwh)) {
        monthlyKwh = 0;
      } else if (monthlyKwh < 0) {
        monthlyKwh = 0;
      } else if (monthlyKwh > 100000) {
        monthlyKwh = 100000;
      }
    }

    if (!email || email.length < 3) { setStatus("error"); return; }
    else if (!email.includes("@")) { setStatus("error"); return; }
    else if (email.length > 250) { setStatus("error"); return; }

    if (source === "electricity" || source === "gas") {
      if (monthlyKwh > 0 && monthlyKwh < 50) { setStatus("error"); return; }
    } else if (source === "solar") {
      if (monthlyKwh > 5000) { setStatus("error"); return; }
    } else if (source === "heat") {
      if (monthlyKwh > 0 && monthlyKwh < 1000) { setStatus("error"); return; }
    }

    if (message && message.length > 5000) { setStatus("error"); return; }

    const payload: QuoteRequest = { email, source, monthlyKwh, message };
    const res = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload as unknown as Record<string, unknown>),
    });
    if (res.ok) { setStatus("ok"); } else { setStatus("error"); }
  }

  return (
    <>
      <h1>Angebot anfordern</h1>
      <p>Antwort innerhalb von 24 Stunden, oft schneller. Pflichtfelder sind markiert.</p>
      <form
        className="quote-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(e.currentTarget);
        }}
      >
        <p>
          <label>E-Mail*</label>
          <input name="email" type="email" required />
        </p>
        <p>
          <label>Energieart</label>
          <select name="source" defaultValue="electricity">
            <option value="electricity">Strom</option>
            <option value="gas">Gas</option>
            <option value="solar">Solar</option>
            <option value="heat">Wärme</option>
          </select>
        </p>
        <p>
          <label>Monatlicher Verbrauch (kWh)</label>
          <input name="monthlyKwh" type="number" />
        </p>
        <p>
          <label>Nachricht</label>
          <textarea name="message" rows={4} />
        </p>
        <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
          Anfragen
        </button>
      </form>
      {status === "ok" && <p>Danke, wir melden uns innerhalb von 24h.</p>}
      {status === "error" && <p>Bitte Eingabe prüfen.</p>}
    </>
  );
}
