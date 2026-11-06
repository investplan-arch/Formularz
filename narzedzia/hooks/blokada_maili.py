#!/usr/bin/env python3
"""Blokuje maile i wersje robocze do osób z nie_odpisuj.json (decyzja właściciela).

Działa na mcp__Gmail__send_message, create_draft, update_draft, reply i forward.
Sprawdza adresy w to/cc/bcc oraz słowa z listy w temacie i treści.
Wysyłki gotowej wersji roboczej (samo draftId) nie da się tu sprawdzić,
dlatego blokujemy już tworzenie wersji roboczych do tych osób.
"""
import json
import sys
from pathlib import Path

LISTA = Path(__file__).resolve().parents[2] / ".claude/skills/kapitalownia-asystent/nie_odpisuj.json"


def main():
    wejscie = json.load(sys.stdin)
    nazwa = wejscie.get("tool_name", "").split("__")[-1]
    if nazwa not in ("send_message", "create_draft", "update_draft", "reply", "forward"):
        return 0
    try:
        dane = json.loads(LISTA.read_text())
    except Exception:
        return 0
    maile = {k.lower(): v for k, v in dane.get("maile", {}).items()}
    slowa = [s.lower() for s in dane.get("slowa", [])]
    t = wejscie.get("tool_input", {})
    adresy = [str(a).lower() for pole in ("to", "cc", "bcc") for a in (t.get(pole) or [])]
    tekst = " ".join(str(t.get(p) or "") for p in ("subject", "body", "htmlBody")).lower()
    for a in adresy:
        if a in maile:
            print(f"Mail zatrzymany: tej osobie nigdy nie odpisujemy ({maile[a]}).", file=sys.stderr)
            return 2
    import re
    if re.search(r"https?://|www\.|\b[a-z0-9-]+\.(pl|com|eu|org|net)\b", tekst):
        print("Mail zatrzymany: connector Gmaila zamienia każdy link i domenę (także kapitalownia.pl w stopce) "
              "na przekierowanie google.com/url, czego właściciel zabronił 6.11.2026. Stopka to samo „Kapitałownia”. "
              "Link do płatności wysyłasz na Messengerze albo prosisz właściciela, żeby wysłał go ze swojej aplikacji Gmail.",
              file=sys.stderr)
        return 2
    for s in slowa:
        if s in tekst:
            print(f"Mail zatrzymany: dotyczy osoby, której nie odpisujemy („{s}”, nie_odpisuj.json).", file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
