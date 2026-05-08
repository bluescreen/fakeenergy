# SLOP-2247 — Der Button oben rechts ist leer / man kann nichts lesen

| Field | Value |
|---|---|
| Reporter | Customer Care (eingegangen via Beschwerde-Formular) |
| Assignee | Frontend-Team |
| Priority | Hoch |
| Labels | frontend, header, cta, conversion-loss |
| Affects Version | 4.21.x (Production) |
| Component | Marketing Site |
| Customer ID | (Lead) |
| Created | 2026-05-07 18:33 |

## Beschreibung

> Eingegangen über das Beschwerde-Formular. Lead, vor
> Vertragsabschluss. Customer Care hat als "Conversion-Loss"
> priorisiert weil der Reporter der Funnel-Eintrittspunkt war.

---

Hallo,

ich war gerade auf eurer Webseite und wollte zum Tarif-Funnel
gehen. Oben rechts ist so ein grüner Button im Header, der wirkt
auf den ersten Blick wie ein wichtiger Call-to-Action — aber
**er hat keinen Text drin**. Ich sehe nur eine grüne Pille, leer.

Ich war kurz davor, draufzuklicken, weil ich angenommen habe es
ist der Konfigurator-Button. Aber sicher war ich mir nicht. Mein
Mann hat mir gesagt "klick lieber nicht auf etwas dessen Text du
nicht lesen kannst, könnte alles sein".

Was ich getestet habe:
- Chrome auf MacOS — leerer grüner Button
- Safari auf MacOS — gleiches Problem
- Firefox auf MacOS — gleich

Ich habe in den Browser-Inspektor geguckt (Strg+Shift+I) und da
steht im Button "Tarif konfigurieren" — der Text ist also IN dem
HTML drin. Er wird nur nicht angezeigt. Ich vermute eine
CSS-Farbe die der Hintergrundfarbe entspricht oder so was. Mein
Sohn meinte sowas heißt "low contrast" und ist auch ein
Accessibility-Problem.

Bitte fixt das. Der Button ist eindeutig der Haupt-CTA auf eurer
Webseite, wenn der nicht funktioniert verliert ihr massiv
Kunden. Ich habe es jetzt manuell über den Footer-Link gefunden,
aber 90% der Besucher klicken nicht so weit runter.

Liebe Grüße
P. Schäfer

---

PS: ist das vielleicht ein A/B-Test wo manche User den Button
ohne Text sehen? Wenn ja, sehr seltsame Hypothese — "ob User auf
einen leeren Button klicken um zu sehen was passiert". Würde ich
lassen.
