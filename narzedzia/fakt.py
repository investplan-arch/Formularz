#!/usr/bin/env python3
"""Zapis i sprawdzanie faktów przed wiadomością do klienta.

Zanim napiszesz klientowi kwotę, datę, stan naboru albo warunek programu, sprawdzasz go
w regulaminie albo w aktualnym ogłoszeniu i zapisujesz tutaj ze źródłem. Hook
`sprawdz_wiadomosc.py` nie wypuści wiadomości z faktem, którego tu nie ma.

    python3 narzedzia/fakt.py dodaj --tekst "Nabór WwS w mazowieckim zamknięty 29.09, kolejny nieogłoszony" \
        --zrodlo https://lfr.pl/... --psid 123 --tagi nabor
    python3 narzedzia/fakt.py dodaj --tekst "Umorzenie 6-krotności, max 50% pożyczki" \
        --wartosci "6-krotności;50%" --zrodlo .claude/skills/kapitalownia-asystent/regulaminy/wws_regulamin_nr3_FERS.txt:698 --psid 123
    python3 narzedzia/fakt.py sprawdz --psid 123 "Treść wiadomości do klienta"
    python3 narzedzia/fakt.py lista [--psid 123]

--trwale zapisuje fakt do fakty.json w skillu (regulamin, cennik), domyślnie na 365 dni.
"""
import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fakty_lib as fl  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dodaj")
    d.add_argument("--tekst", required=True, help="fakt jednym zdaniem")
    d.add_argument("--zrodlo", required=True, help="URL albo ścieżka pliku w repo (z :linią)")
    d.add_argument("--wartosci", default="", help="liczby i daty z faktu, rozdzielone ;")
    d.add_argument("--psid", help="klient, którego dotyczy sprawdzenie")
    d.add_argument("--tagi", default="", help="np. nabor, warunek, cena")
    d.add_argument("--slowa", default="", help="słowa, po których rozpoznać temat (trwałe fakty)")
    d.add_argument("--waznosc", type=int, help="ile dni fakt jest ważny (nabór 3, warunek 30)")
    d.add_argument("--trwale", action="store_true")
    s = sub.add_parser("sprawdz")
    s.add_argument("tekst")
    s.add_argument("--psid")
    l = sub.add_parser("lista")
    l.add_argument("--psid")
    a = ap.parse_args()

    if a.cmd == "dodaj":
        if not fl.poprawne_zrodlo(a.zrodlo):
            print("Źródło musi być adresem URL albo istniejącym plikiem w repozytorium.", file=sys.stderr)
            return 1
        tagi = [t.strip() for t in a.tagi.split(",") if t.strip()]
        wartosci = [w.strip() for w in a.wartosci.split(";") if w.strip()] or sorted(fl.tokeny(a.tekst))
        waznosc = a.waznosc or (3 if "nabor" in tagi else 30 if not a.trwale else 365)
        f = {"tekst": a.tekst, "wartosci": wartosci, "zrodlo": a.zrodlo, "tagi": tagi,
             "slowa": [x.strip() for x in a.slowa.split(";") if x.strip()],
             "sprawdzono": datetime.now().isoformat(timespec="minutes"), "waznosc_dni": waznosc}
        if a.trwale:
            dane = json.loads(fl.TRWALE.read_text())
            dane["fakty"].append(f)
            fl.TRWALE.write_text(json.dumps(dane, ensure_ascii=False, indent=1) + "\n")
        else:
            if a.psid:
                f["psid"] = str(a.psid)
            fl.SESJA.parent.mkdir(parents=True, exist_ok=True)
            with fl.SESJA.open("a") as plik:
                plik.write(json.dumps(f, ensure_ascii=False) + "\n")
        print("Zapisano:", f["tekst"], "| wartości:", ", ".join(wartosci) or "brak", "| ważne dni:", waznosc)
    elif a.cmd == "sprawdz":
        braki = fl.sprawdz(a.tekst, a.psid)
        print("\n".join(braki) if braki else "OK, każdy fakt ma źródło.")
        return 1 if braki else 0
    else:
        for f in fl.fakty(a.psid):
            print(f"[{f['rodzaj']}] {f['tekst']} | {', '.join(f.get('wartosci', []))} | {f['zrodlo']} | {f.get('sprawdzono', '')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
