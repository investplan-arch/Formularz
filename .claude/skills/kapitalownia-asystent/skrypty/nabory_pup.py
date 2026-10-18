#!/usr/bin/env python3
"""Lista naborów urzędów pracy z portalu Zielona Linia (zielonalinia.gov.pl).

Portal publikuje ogłoszenia PUP z całej Polski przez publiczne API WordPressa.
Skrypt pobiera wpisy z ostatnich dni, filtruje je po temacie i opcjonalnie po
nazwie urzędu i wypisuje datę publikacji, tytuł, terminy, kwoty i link.

Przykłady
  python3 nabory_pup.py                      # dotacje na start z ostatnich 45 dni
  python3 nabory_pup.py --temat kfs          # nabory KFS
  python3 nabory_pup.py --temat pfron --dni 60
  python3 nabory_pup.py --urzad "Legnica"    # tylko wybrany urząd
  python3 nabory_pup.py --temat wszystko --dni 14

Wynik to tylko lista do sprawdzenia. Warunki zawsze potwierdzasz w ogłoszeniu
na stronie urzędu (link „Źródło” w treści wpisu).
"""
import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://zielonalinia.gov.pl/wp-json/wp/v2/posts"

# Wzorce tytułów dla tematów. „wszystko” łączy wszystkie formy wsparcia dla
# firm i osób zakładających firmę, bez ofert pracy i szkoleń dla bezrobotnych.
TEMATY = {
    "start": r"podjęci\w* działalności|rozpoczęci\w* działalności|jednorazow\w* środk|dotacj",
    "pfron": r"PFRON|niepełnospraw",
    "kfs": r"KFS|Krajow\w* Fundusz\w* Szkoleniow|kształceni\w* ustawiczn",
    "pracodawca": r"stanowisk\w* pracy|Voucher|prac interwencyjn|refundacj|zatrudnieni\w* wspomagan",
    "spoldzielnia": r"spółdziel|przedsiębiorstw\w* społeczn",
}
TEMATY["wszystko"] = "|".join(TEMATY.values()) + r"|startup|Fundusz\w* Europejsk|B\+R|pożyczk"

MIESIACE = "stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia"
RE_DATA = re.compile(rf"\b\d{{1,2}}[./]\d{{1,2}}[./]20\d\d|\b\d{{1,2}} (?:{MIESIACE}) 20\d\d")
RE_KWOTA = re.compile(r"\d[\d .]{2,}(?:,\d{2})? ?zł")

# Portal publikuje do kilkudziesięciu wpisów dziennie, 100 na stronę to limit API.
NA_STRONE = 100
MAKS_STRON = 5


# Serwer portalu czasem zrywa połączenie, zwykle druga próba przechodzi.
PROBY = 3


def pobierz_strone(req):
    for proba in range(1, PROBY + 1):
        try:
            with urllib.request.urlopen(req, timeout=40) as odp:
                return json.load(odp)
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if proba == PROBY:
                raise
            time.sleep(2 * proba)


def pobierz(po_dacie):
    wpisy = []
    for strona in range(1, MAKS_STRON + 1):
        zapytanie = urllib.parse.urlencode({
            "per_page": NA_STRONE,
            "page": strona,
            "after": po_dacie.strftime("%Y-%m-%dT00:00:00"),
            "_fields": "date,title,link,content",
        })
        req = urllib.request.Request(f"{API}?{zapytanie}", headers={"User-Agent": "Mozilla/5.0"})
        try:
            partia = pobierz_strone(req)
        except urllib.error.HTTPError as e:
            # API zwraca 400, gdy strona wykracza poza liczbę wyników.
            if e.code == 400:
                break
            raise
        wpisy.extend(partia)
        if len(partia) < NA_STRONE:
            break
    return wpisy


def tekst(wpis):
    surowy = re.sub(r"<[^>]+>", " ", wpis["content"]["rendered"])
    return html.unescape(re.sub(r"\s+", " ", surowy)).strip()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--temat", choices=sorted(TEMATY), default="start")
    p.add_argument("--dni", type=int, default=45, help="ile dni wstecz (domyślnie 45)")
    p.add_argument("--urzad", help="fragment nazwy urzędu lub miasta, np. Legnica")
    p.add_argument("--json", action="store_true", help="wynik w JSON")
    a = p.parse_args()

    od = dt.date.today() - dt.timedelta(days=a.dni)
    try:
        wpisy = pobierz(od)
    except Exception as e:  # sieć, proxy, zmiana API
        print(f"Nie udało się pobrać danych z {API}: {e}", file=sys.stderr)
        print("Zastępczo wyszukaj w sieci: zielonalinia.gov.pl PUP [miasto] nabór", file=sys.stderr)
        sys.exit(1)

    wzorzec = re.compile(TEMATY[a.temat], re.I)
    wyniki = []
    for w in wpisy:
        tytul = html.unescape(w["title"]["rendered"])
        if not wzorzec.search(tytul):
            continue
        if a.urzad and a.urzad.lower() not in tytul.lower():
            continue
        tresc = tekst(w)
        wyniki.append({
            "data": w["date"][:10],
            "tytul": tytul,
            "terminy": RE_DATA.findall(tresc)[:6],
            "kwoty": RE_KWOTA.findall(tresc)[:4],
            "opis": tresc[:400],
            "link": w["link"],
        })

    if a.json:
        print(json.dumps(wyniki, ensure_ascii=False, indent=2))
        return
    if not wyniki:
        print(f"Brak wpisów dla tematu „{a.temat}” z ostatnich {a.dni} dni.")
        return
    for r in wyniki:
        print(f"{r['data']} | {r['tytul']}")
        if r["terminy"]:
            print(f"    terminy w treści: {', '.join(r['terminy'])}")
        if r["kwoty"]:
            print(f"    kwoty w treści: {', '.join(r['kwoty'])}")
        print(f"    {r['link']}")


if __name__ == "__main__":
    main()
