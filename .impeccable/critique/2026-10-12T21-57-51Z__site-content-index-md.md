---
target: strona główna i formularz Kapitałowni
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Formularz/site/content/index.md"
target_fingerprint: "sha256:bd44e608e3dc288a2308971f3c584f93131c24d80520d791e85cdb1dc6572abb"
target_path: /home/user/Formularz/site/content/index.md
timestamp: 2026-10-12T21-57-51Z
slug: site-content-index-md
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 22/32 (69%, Acceptable), heuristics 7 and 10 n/a (Persuade)
1 Status 3 · 2 Real world 3 · 3 Control 2 · 4 Consistency 2 · 5 Error prevention 3 · 6 Recognition 3 · 7 n/a · 8 Minimalism 2 · 9 Error recovery 4 · 10 n/a

## Design specificity
Authored: program cards with Kwota, Dla kogo, Forma, Nabór, plus/minus and dated official sources; "Uczciwie o szansach"; branching form. Generic: hero/eyebrow/watermark, 4-card bento, 01–04 steps, Dlaczego checklist, CTA band.

## Priority issues
- [P1] Copy promised prices and online payment that do not exist yet (all services cena null).
- [P1] Homepage IA: four full startup program cards before "Z kim pracujemy"; ~4500px on mobile.
- [P1] "Zamów wniosek" led to a quote request that loops back to the form.
- [P2] Thin trust anchors: empty company data, gmail-only contact.
- [P2] Long mobile form without draft persistence; reassurance placed after the form; minlength hidden.

## Detector (13 findings): low-contrast hover x4 (false positive, specificity), cramped-padding x5 (footer bottom on mobile real; hero false positive), overused-font Geist x4 (style signal). Browser: kicker-above-heading on all pages, line-length ~97ch on 2 pages.

## Persona red flags
Jordan: jargon (de minimis, karencja, LGD, pośrednik BGK), two CTAs with unclear difference. Riley: promised payment absent, button label reset to wrong text after error, refresh loses form. Casey: small consent target, no draft saving.
