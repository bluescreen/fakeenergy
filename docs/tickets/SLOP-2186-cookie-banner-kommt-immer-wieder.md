# SLOP-2186 — Cookie-Banner kommt jedes Mal wieder obwohl ich auf OK geklickt habe

| Field | Value |
|---|---|
| Reporter | Customer Care (eingegangen via Beschwerde-Formular) |
| Assignee | Frontend-Team |
| Priority | Mittel |
| Labels | frontend, cookie-consent, dsgvo, conversion-loss |
| Affects Version | 4.21.x (Production) |
| Component | Marketing Site |
| Customer ID | (Lead) |
| Created | 2026-05-07 14:09 |

## Beschreibung

> Eingegangen über das Beschwerde-Formular. Customer Care hat als
> "DSGVO-relevant" markiert und priorisiert weitergeleitet.
> Reporter ist laut eigener Aussage Datenschutzbeauftragte.

---

Hi,

ich versuche seit gestern auf eurer Webseite die Tarife zu
vergleichen aber jedes Mal wenn ich auf eine andere Seite klicke
(z.B. von "Strom" zu "Gas" oder zurück zur Startseite) kommt das
Cookie-Banner wieder. Ich habe schon ungefähr 15 mal auf "OK"
geklickt.

Das ist sehr nervig. Ich habe das auf zwei Browsern getestet:

- Chrome auf Windows: Banner kommt jedes Mal wieder
- Safari auf iPhone: gleiches Problem

Ich habe extra in den Browser-Einstellungen geprüft, Cookies sind
erlaubt, eure Seite steht nicht in der Blockierliste, kein
Tracking-Schutz aktiv.

Mein Sohn (Informatikstudent) hat sich das angeschaut. Er hat die
Browser-Konsole geöffnet (oder so) und gesagt:

> "Schau mal, in localStorage steht was unter
> 'slopwerk-cookie-consent', der Wert ist '1'. Die Seite speichert
> dass du geklickt hast aber liest es nicht richtig zurück, sie
> sucht wahrscheinlich nach was anderem."

Ist wohl ein Bug auf eurer Seite. Ich verstehe nicht alles davon
aber das hat er gemeint.

Bitte fixt das. Ich war jetzt zwei Tage lang am genervt-sein und
hab mich daher fast für einen anderen Anbieter entschieden. Wenn
ihr das nicht in den Griff kriegt was sagt das über die
Abrechnungssysteme aus?

DSGVO-rechtlich ist das übrigens auch fragwürdig wenn die
Einwilligung nicht persistent gespeichert wird. Bin selbst
Datenschutzbeauftragte in einer mittelständischen Firma und
kenne mich da aus — Art. 7 Abs. 3 DSGVO sagt zwar Widerruf muss
genauso einfach sein wie Erteilung, aber wenn die Erteilung
selbst nicht hält ist das auch nicht in Ordnung.

Grüße
S. Reimer

---

PS: meine Kollegin hat gesagt sie hatte das Problem nicht. Aber
sie nutzt Edge und ist nur kurz auf der Startseite gewesen, hat
nicht weitergeklickt. Vielleicht hängt es mit dem Seitenwechsel
oder Reload zusammen?
