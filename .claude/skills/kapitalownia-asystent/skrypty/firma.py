#!/usr/bin/env python3
"""Sprawdzenie firmy klienta w publicznych rejestrach po NIP albo numerze KRS.

Kwalifikacja często zależy od historii firmy. PUP i premia LGD wykluczają osoby,
które niedawno prowadziły działalność, a pożyczki dla firm wymagają określonego
stażu. Skrypt zbiera to, co mówią rejestry, zanim padnie odpowiedź klientowi.

Źródła
  Biała lista VAT (MF)   nazwa, status VAT, daty rejestracji i wykreślenia, KRS.
                          Bez klucza. Firmy zwolnione z VAT często nie figurują.
  KRS (MS)               spółki, fundacje, stowarzyszenia, spółdzielnie. Bez klucza.
  CEIDG (biznes.gov.pl)  jednoosobowe działalności, daty rozpoczęcia, zawieszenia
                          i zakończenia. Wymaga bezpłatnego tokenu w CEIDG_TOKEN.

Przykłady
  python3 firma.py 7393982505             # NIP
  python3 firma.py --krs 0000019193       # numer KRS
  python3 firma.py 7393982505 --json

Rejestry pokazują stan formalny. Brak wpisu w białej liście nie znaczy, że firmy
nie ma, a historię zawieszeń potwierdza tylko CEIDG.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

WL_API = "https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={data}"
KRS_API = "https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/{krs}?rejestr={rejestr}&format=json"
CEIDG_API = "https://dane.biznes.gov.pl/api/ceidg/v3/firmy?nip={nip}"

# Biała lista ma ochronę przed botami i przy kolejnych zapytaniach potrafi
# zwrócić stronę HTML zamiast JSON. Druga próba po przerwie zwykle przechodzi.
PROBY = 3

WAGI_NIP = (6, 5, 7, 2, 3, 4, 5, 6, 7)


def poprawny_nip(nip):
    if not re.fullmatch(r"\d{10}", nip):
        return False
    suma = sum(int(c) * w for c, w in zip(nip, WAGI_NIP))
    return suma % 11 == int(nip[9])


def pobierz_json(url, naglowki=None):
    req = urllib.request.Request(url, headers={"User-Agent": "kapitalownia-firma/1.0", **(naglowki or {})})
    for proba in range(1, PROBY + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as odp:
                tresc = odp.read()
            return json.loads(tresc)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 404):
                return {"_blad": e.code}
            if proba == PROBY:
                return {"_blad": e.code}
        except (urllib.error.URLError, TimeoutError, ConnectionError, json.JSONDecodeError) as e:
            if proba == PROBY:
                return {"_blad": str(e)}
        time.sleep(3 * proba)


def biala_lista(nip):
    dane = pobierz_json(WL_API.format(nip=nip, data=dt.date.today().isoformat()))
    if "_blad" in dane:
        return {"zrodlo": "biała lista VAT", "blad": dane["_blad"]}
    p = (dane.get("result") or {}).get("subject")
    if not p:
        return {"zrodlo": "biała lista VAT", "brak": "NIP nie figuruje (często firma zwolniona z VAT albo niezarejestrowana do VAT)"}
    return {
        "zrodlo": "biała lista VAT",
        "nazwa": p.get("name"),
        "status_vat": p.get("statusVat"),
        "regon": p.get("regon"),
        "krs": p.get("krs"),
        "adres": p.get("workingAddress") or p.get("residenceAddress"),
        "rejestracja_vat": p.get("registrationLegalDate"),
        "odmowa_rejestracji": p.get("registrationDenialDate"),
        "wykreslenie_vat": p.get("removalDate"),
        "przywrocenie_vat": p.get("restorationDate"),
    }


def krs(numer):
    numer = numer.zfill(10)
    for rejestr in ("P", "S"):
        dane = pobierz_json(KRS_API.format(krs=numer, rejestr=rejestr))
        if "_blad" not in dane and "odpis" in dane:
            break
    else:
        return {"zrodlo": "KRS", "brak": f"brak odpisu dla KRS {numer}"}
    o = dane["odpis"]
    podmiot = o["dane"]["dzial1"]["danePodmiotu"]
    pkd = (o["dane"].get("dzial3") or {}).get("przedmiotDzialalnosci") or {}
    glowne = pkd.get("przedmiotPrzewazajacejDzialalnosci") or []
    return {
        "zrodlo": "KRS",
        "nazwa": podmiot.get("nazwa"),
        "forma": podmiot.get("formaPrawna"),
        "nip": (podmiot.get("identyfikatory") or {}).get("nip"),
        "rejestr": "przedsiębiorców" if o["naglowekA"].get("rejestr") == "RejP" else "stowarzyszeń i fundacji",
        "data_rejestracji": o["naglowekA"].get("dataRejestracjiWKRS"),
        "stan_z_dnia": o["naglowekA"].get("stanZDnia"),
        "pkd_glowne": [f'{g.get("kodDzial")}.{g.get("kodKlasa")}.{g.get("kodPodklasa")} {g.get("opis")}' for g in glowne],
    }


def ceidg(nip):
    token = os.environ.get("CEIDG_TOKEN")
    if not token:
        return {"zrodlo": "CEIDG", "brak": "brak CEIDG_TOKEN, sprawdź ręcznie na biznes.gov.pl (wyszukiwarka firm)"}
    dane = pobierz_json(CEIDG_API.format(nip=nip), {"Authorization": f"Bearer {token}"})
    if "_blad" in dane:
        return {"zrodlo": "CEIDG", "blad": dane["_blad"]}
    firmy = dane.get("firmy") or []
    if not firmy:
        return {"zrodlo": "CEIDG", "brak": "NIP nie figuruje w CEIDG (może to spółka albo osoba bez działalności)"}
    pola = ("nazwa", "status", "dataRozpoczecia", "dataZawieszenia", "dataWznowienia", "dataZakonczenia", "dataWykreslenia")
    return {"zrodlo": "CEIDG", "wpisy": [{k: f.get(k) for k in pola if f.get(k)} for f in firmy]}


def wypisz(wyniki):
    for w in wyniki:
        print(f'\n[{w.pop("zrodlo")}]')
        for k, v in w.items():
            if v in (None, "", []):
                continue
            if isinstance(v, list):
                for el in v:
                    print(f"  {k}: {el}")
            else:
                print(f"  {k}: {v}")


def main():
    ap = argparse.ArgumentParser(description="Sprawdzenie firmy w białej liście VAT, KRS i CEIDG.")
    ap.add_argument("nip", nargs="?", help="NIP, z kreskami albo bez")
    ap.add_argument("--krs", help="numer KRS, gdy nie ma NIP")
    ap.add_argument("--json", action="store_true", help="wynik w JSON")
    a = ap.parse_args()
    if not a.nip and not a.krs:
        ap.error("podaj NIP albo --krs")

    wyniki = []
    if a.nip:
        nip = re.sub(r"\D", "", a.nip)
        if not poprawny_nip(nip):
            sys.exit(f"NIP {a.nip} ma złą sumę kontrolną, poproś klienta o sprawdzenie.")
        wl = biala_lista(nip)
        wyniki.append(wl)
        wyniki.append(ceidg(nip))
        if wl.get("krs") and not a.krs:
            wyniki.append(krs(wl["krs"]))
    if a.krs:
        wyniki.append(krs(re.sub(r"\D", "", a.krs)))

    if a.json:
        print(json.dumps(wyniki, ensure_ascii=False, indent=2))
    else:
        wypisz(wyniki)


if __name__ == "__main__":
    main()
