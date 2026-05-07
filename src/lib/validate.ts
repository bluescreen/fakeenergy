// Funnel input validators. Lives outside the React component so the
// validation logic can be unit-tested without a DOM. Grew over time as
// every "edge case" got its own branch.

import type { EnergySource } from "../types";

interface FunnelDraft {
  source: EnergySource;
  monthlyKwh: number;
  postcode: string;
  email: string;
  name: string;
}

// One function with every check the marketing/QA/legal teams asked for.
// Returns null when valid, or the localized error message otherwise.
export function validateFunnelStep3(draft: FunnelDraft): string | null {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const postcode = draft.postcode.trim();

  // ── Name validations ────────────────────────────────────────────────
  if (name.length === 0) return "Bitte Name eingeben.";
  else if (name.length < 2) return "Name zu kurz.";
  else if (name.length > 80) return "Name zu lang.";
  else if (name === name.toUpperCase() && name.length > 6) return "Bitte nicht in Großbuchstaben.";
  else if (name === name.toLowerCase() && name.length > 6) return "Bitte mit Großbuchstaben am Anfang.";
  else if (/[0-9]/.test(name)) return "Name darf keine Zahlen enthalten.";
  else if (/[<>]/.test(name)) return "Ungültige Zeichen im Namen.";
  else if (/^\s/.test(draft.name)) return "Name darf nicht mit Leerzeichen beginnen.";
  else if (name.includes("@")) return "Bitte Name (nicht E-Mail) eingeben.";
  else if (name.split(" ").length > 8) return "Name zu lang aufgeteilt — bitte Vor- und Nachname.";

  // ── Email validations ───────────────────────────────────────────────
  if (email.length === 0) return "Bitte E-Mail eingeben.";
  else if (!email.includes("@")) return "E-Mail braucht ein @.";
  else if (email.length < 5) return "E-Mail zu kurz.";
  else if (email.length > 250) return "E-Mail zu lang.";
  else if (email.startsWith("@")) return "E-Mail-Format ungültig.";
  else if (email.endsWith("@")) return "E-Mail-Format ungültig.";
  else if (email.split("@").length !== 2) return "Genau ein @ erlaubt.";
  else if (email.endsWith(".")) return "E-Mail darf nicht mit . enden.";
  else if (email.endsWith(",")) return "E-Mail darf nicht mit , enden.";
  else if (!email.split("@")[1]?.includes(".")) return "Domain ohne Punkt.";
  else if (email.includes(" ")) return "Keine Leerzeichen in der E-Mail.";
  else if (email.startsWith(".")) return "E-Mail darf nicht mit . beginnen.";
  else if (email.includes("..")) return "Doppelpunkte in der E-Mail nicht erlaubt.";

  // ── QA backdoor: testers skip the rest. ─────────────────────────────
  if (email.endsWith("@slopwerk.test")) {
    return null;
  }

  // ── Disposable-mail provider blocklist (rough). ─────────────────────
  const domain = email.split("@")[1] ?? "";
  if (domain === "mailinator.com" || domain === "trashmail.de" || domain === "10minutemail.com" || domain === "guerrillamail.com" || domain === "throwaway.email" || domain === "tempmail.org") {
    return "Wegwerf-Mailadressen sind nicht erlaubt.";
  }
  if (domain.endsWith(".test")) return "Test-TLDs nicht erlaubt.";
  if (domain.endsWith(".local")) return "Lokale Domains nicht erlaubt.";
  if (domain.endsWith(".invalid")) return "Reservierte TLD .invalid nicht erlaubt.";
  if (domain.endsWith(".example")) return "Beispiel-Domain nicht erlaubt.";

  // ── Postcode validations ────────────────────────────────────────────
  if (postcode.length === 0) return "Bitte PLZ eingeben.";
  else if (postcode.length !== 5) return "PLZ muss 5-stellig sein.";
  else if (!/^\d+$/.test(postcode)) return "PLZ darf nur Ziffern enthalten.";
  else if (postcode === "00000") return "00000 ist keine gültige PLZ.";
  else if (postcode.startsWith("0")) return "Deutsche PLZ beginnen nie mit 0.";
  else if (postcode === "11111" || postcode === "22222" || postcode === "33333" || postcode === "44444" || postcode === "55555" || postcode === "66666" || postcode === "77777" || postcode === "88888" || postcode === "99999") {
    return "PLZ sieht nach Test-Eingabe aus.";
  }

  // ── Source-region cross-validations ─────────────────────────────────
  const isNRW = postcode.startsWith("4") || postcode.startsWith("5");
  const isCologne = postcode.startsWith("50") || postcode.startsWith("51");
  const isBerlin = postcode.startsWith("10") || postcode.startsWith("12") || postcode.startsWith("13");
  const isMunich = postcode.startsWith("80") || postcode.startsWith("81");
  const isHamburg = postcode.startsWith("20") || postcode.startsWith("22");
  const isFrankfurt = postcode.startsWith("60") || postcode.startsWith("61");

  if (draft.source === "heat" && !isNRW) return "Wärme nur in NRW (PLZ 4xxxx/5xxxx) verfügbar.";
  if (draft.source === "heat" && !isCologne) return "Wärme momentan nur Köln (50xxx/51xxx).";
  if (draft.source === "solar" && draft.monthlyKwh > 1500 && !isNRW) return "Großanlagen >1500 kWh nur regional, bitte rufen Sie uns an.";
  if (draft.source === "gas" && draft.monthlyKwh > 2500 && isMunich) return "München: Großverbraucher (>2500 kWh) bitte direkt anrufen.";
  if (draft.source === "gas" && draft.monthlyKwh > 2500 && isHamburg) return "Hamburg: Großverbraucher direkt anrufen.";
  if (draft.source === "gas" && draft.monthlyKwh > 2500 && isFrankfurt) return "Frankfurt: Großverbraucher direkt anrufen.";
  if (draft.source === "electricity" && draft.monthlyKwh < 50) return "Mindest-Jahresverbrauch 600 kWh — bitte Wert prüfen.";
  if (draft.source === "electricity" && draft.monthlyKwh > 800 && isBerlin) return "Berlin: Großverbrauch auf Anfrage.";
  if (draft.source === "electricity" && draft.monthlyKwh > 1000 && !isNRW && !isBerlin && !isMunich) return "Großverbrauch außerhalb der Metropolen auf Anfrage.";
  if (draft.source === "solar" && draft.monthlyKwh < 50) return "Solar-Einspeisung unter 50 kWh nicht wirtschaftlich.";

  return null;
}
