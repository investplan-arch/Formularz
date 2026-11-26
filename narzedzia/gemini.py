#!/usr/bin/env python3
"""Druga para oczu: pyta Gemini o zgodność tekstu z regulaminem.

Klucz bierze ze zmiennej środowiskowej GEMINI_API_KEY (albo z sekretu sieciowego
środowiska, wtedy wystarczy dowolna wartość). Klucza nie zapisujemy w plikach.

Przykład:
  python3 narzedzia/gemini.py --plik regulaminy/nowefio_2027_p2-4_regulamin.txt \
      --plik /sciezka/do/maila.txt \
      --pytanie "Czy fakty w mailu są zgodne z regulaminem? Wypisz rozbieżności."

Nie wysyłaj danych osobowych klientów (nazwiska, telefony, e-maile, PESEL).
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
INSTRUKCJA = (
    "Jesteś weryfikatorem w biurze piszącym wnioski o dotacje. Sprawdzasz tekst "
    "przygotowany dla klienta wyłącznie względem załączonych dokumentów źródłowych. "
    "Odpowiadasz po polsku, krótko, w punktach: najpierw rozbieżności i błędy "
    "(z cytatem lub numerem linii źródła), potem rzeczy niepewne. Jeśli wszystko się "
    "zgadza, napisz jedno zdanie: Brak rozbieżności."
)
OSOBOWE = [re.compile(p) for p in (
    r"[\w.+-]+@[\w-]+\.[\w.]+",            # e-mail
    r"(?<!\d)(?:\+?48[ -]?)?\d{3}[ -]?\d{3}[ -]?\d{3}(?!\d)",  # telefon
    r"(?<!\d)\d{11}(?!\d)",                # PESEL
)]


def anonimizuj(tekst: str) -> str:
    for wzor in OSOBOWE:
        tekst = wzor.sub("[usunięte]", tekst)
    return tekst


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pytanie", required=True)
    ap.add_argument("--plik", action="append", default=[], help="plik z kontekstem, można wiele")
    ap.add_argument("--model", default="gemini-3.8-flash")
    a = ap.parse_args()

    klucz = os.environ.get("GEMINI_API_KEY", "")
    czesci = []
    for sciezka in a.plik:
        with open(sciezka, encoding="utf-8", errors="replace") as f:
            tresc = anonimizuj(f.read())
        czesci.append(f"=== {os.path.basename(sciezka)} ===\n{tresc}")
    czesci.append("=== PYTANIE ===\n" + anonimizuj(a.pytanie))

    body = {
        "systemInstruction": {"parts": [{"text": INSTRUKCJA}]},
        "contents": [{"role": "user", "parts": [{"text": "\n\n".join(czesci)}]}],
        "generationConfig": {"temperature": 0.2},
    }
    modele = [a.model] + [m for m in ("gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest") if m != a.model]
    d, ostatni = None, ""
    for model in modele:
        for proba in range(3):
            req = urllib.request.Request(
                URL.format(model=model),
                data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json", "x-goog-api-key": klucz},
            )
            try:
                with urllib.request.urlopen(req, timeout=240) as r:
                    d = json.load(r)
                break
            except urllib.error.HTTPError as e:
                ostatni = f"{model} {e.code}: {e.read().decode()[:300]}"
                if e.code in (429, 500, 503):
                    time.sleep(5 * (proba + 1))
                    continue
                break
            except (TimeoutError, OSError) as e:
                ostatni = f"{model}: {e}"
                time.sleep(5)
                continue
        if d:
            break
    if not d:
        print("Błąd Gemini, " + ostatni, file=sys.stderr)
        return 1
    tekst = "".join(p.get("text", "") for c in d.get("candidates", [])
                    for p in c.get("content", {}).get("parts", []))
    print(tekst.strip() or json.dumps(d)[:400])
    return 0


if __name__ == "__main__":
    sys.exit(main())
