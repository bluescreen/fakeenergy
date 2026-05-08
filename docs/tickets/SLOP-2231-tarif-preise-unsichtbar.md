# SLOP-2231 — Auf den Tarif-Karten kann ich die Preise nicht sehen

| Field | Value |
|---|---|
| Reporter | Customer Care (eingegangen via Beschwerde-Formular) |
| Assignee | Frontend-Team |
| Priority | Hoch |
| Labels | frontend, energycard, conversion-loss, accessibility |
| Affects Version | 4.21.x (Production) |
| Component | Marketing Site |
| Customer ID | (Lead) |
| Created | 2026-05-07 11:14 |

## Beschreibung

> Eingegangen über das Beschwerde-Formular. Lead, hatte schon den
> Funnel gestartet bevor die Tarif-Karten geladen sind. Customer
> Care hat als "Conversion-Loss" priorisiert.

---

Hallo,

ich war heute auf eurer Startseite und habe versucht die Preise
für die vier Tarife zu vergleichen. Auf den Karten (Strom, Gas,
Solar, Wärme) sehe ich überall den Titel und die kleinen
Aufzählungspunkte ("100% Ökostrom", "12 Monate Mindestlaufzeit"
etc.) — aber **die Preise selbst sind nicht da**.

Ich meine es steht "ab" und dann eine leere Stelle wo eigentlich
"0,32 € / kWh" oder so stehen sollte. Bei genauerem Hinsehen sehe
ich da etwas in extrem hellem Grau auf weißem Hintergrund — fast
unsichtbar. Ich musste die Helligkeit meines Bildschirms auf
Maximum drehen um das überhaupt zu sehen.

Hier ein paar Punkte die ich getestet habe:

- Chrome, Safari, Firefox auf meinem MacBook → alle drei zeigen
  das Problem
- Auf dem iPad ist es genauso
- Ich habe meine Brille geputzt, hat nicht geholfen 😅

Mein Sohn (Webentwickler) hat sich das angesehen und in den
Browser-Inspektor geguckt. Er meinte: "Schau mal, der CSS-Style
auf der `.price` ist hartcodiert auf eine fast-weiße Farbe, die
exakt wie der Karten-Hintergrund aussieht. Das wirkt wie ein
inline-style irgendwo, nicht wie ein normales CSS-Problem."

Ich verstehe nicht alles davon aber das hat er gemeint.

Bitte fixt das. Ich kann eure Tarife nicht vergleichen ohne die
Preise zu sehen, das ist ja absurd. Auch DSGVO-rechtlich (oder
verbraucherrechtlich) muss ein Preis ja klar erkennbar sein bevor
man einen Vertrag abschließt.

Grüße
B. Walter

---

PS: vielleicht ist das auch ein Accessibility-Problem (für
Sehbehinderte oder Farbenblinde). Mein Sohn meinte WCAG-Kontrast
ist da nicht eingehalten.
