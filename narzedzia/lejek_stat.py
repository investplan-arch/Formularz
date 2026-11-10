#!/usr/bin/env python3
"""Statystyki lejka z Messengera strony (przegląd sprzedaży, właściciel 10.11.2026).

    python3 narzedzia/lejek_stat.py --dni 45

Liczy: ile rozmów doszło do ceny i linku, co klient zrobił po cenie i po linku,
czas pierwszej odpowiedzi a dojście do ceny, skuteczność wiadomości po komentarzu
i listę kontaktów (telefon, e-mail), które klient zostawił, a rozmowa stanęła.
Nic nie wysyła i niczego nie zapisuje.
"""
import argparse, re, statistics, sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import leady  # noqa: E402

TEL = re.compile(r"(?<!\d)(?:\+48[ -]?)?\d{3}[ -]?\d{3}[ -]?\d{3}(?!\d)")
MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dni", type=int, default=30)
    a = ap.parse_args()
    P, teraz = leady.PAGE, datetime.now(timezone.utc)
    wszystkie = zimne = zimne_odp = 0
    etap, prod_etap = Counter(), defaultdict(Counter)
    po_cenie, po_linku = Counter(), Counter()
    opoznienia, kontakty, bez_odpowiedzi = [], [], 0
    for c in leady.pobierz(a.dni):
        w = [m for m in c["messages"] if not m["message"].startswith("Odpowiadasz na komentarz")]
        if not w:
            continue
        wszystkie += 1
        nazwa = next((p["name"] for p in c["participants"]["data"] if p["id"] != P), "?")
        jego = [m for m in w if m["from"]["id"] != P]
        nasze = [m for m in w if m["from"]["id"] == P]
        if w[0]["from"]["id"] == P:
            zimne += 1
            zimne_odp += bool(jego)
        if not jego:
            continue
        calosc = " ".join(m["message"] for m in w).lower()
        prod = ("SPLOT" if "splot" in calosc else "NIW" if ("proo" in calosc or "nowefio" in calosc)
                else "WwS" if "wsparcie w starcie" in calosc else "PUP" if "urzęd" in calosc else "inne")
        i_cena = next((i for i, m in enumerate(w) if m["from"]["id"] == P and leady.CENA.search(m["message"])), None)
        i_link = next((i for i, m in enumerate(w) if m["from"]["id"] == P and leady.LINK.search(m["message"])), None)
        e = "link" if i_link is not None else "cena" if i_cena is not None else "kwalifikacja"
        etap[e] += 1
        prod_etap[prod][e] += 1
        if i_cena is not None:
            po_cenie["odpisał" if any(m["from"]["id"] != P for m in w[i_cena + 1:]) else "cisza"] += 1
        if i_link is not None:
            po_linku["odpisał" if any(m["from"]["id"] != P for m in w[i_link + 1:]) else "cisza"] += 1
        if w[0]["from"]["id"] != P:
            if nasze:
                d = (leady.czas(nasze[0]["created_time"]) - leady.czas(w[0]["created_time"])).total_seconds() / 3600
                opoznienia.append((d, e != "kwalifikacja"))
            else:
                bez_odpowiedzi += 1
        tekst = " ".join(m["message"] for m in jego)
        tel, mail = TEL.search(tekst), MAIL.search(tekst)
        h = (teraz - leady.czas(w[-1]["created_time"])).total_seconds() / 3600
        if (tel or mail) and h > 24 and not leady.SPAM.search(tekst.lower()):
            kontakty.append((h, nazwa, e, tel.group(0) if tel else "", mail.group(0) if mail else ""))

    rozm = sum(etap.values())
    print(f"Rozmowy z {a.dni} dni: {wszystkie}, klient odpisał w {rozm}")
    print(f"Etap końcowy: kwalifikacja {etap['kwalifikacja']}, cena {etap['cena']}, link {etap['link']}")
    print(f"Po cenie: odpisało {po_cenie['odpisał']}, cisza {po_cenie['cisza']}")
    print(f"Po linku: odpisało {po_linku['odpisał']}, cisza {po_linku['cisza']}")
    print("Według tematu (rozmowy / do ceny / do linku):")
    for p, e in sorted(prod_etap.items(), key=lambda x: -sum(x[1].values())):
        print(f"  {p}: {sum(e.values())} / {e['cena'] + e['link']} / {e['link']}")
    print(f"Wiadomości po komentarzu: {zimne}, odpowiedzi {zimne_odp}")
    if opoznienia:
        print(f"Pierwsza odpowiedź: mediana {statistics.median(d for d, _ in opoznienia):.1f} h, "
              f"klient pisał i nie dostał żadnej odpowiedzi: {bez_odpowiedzi}")
        for lo, hi in [(0, 1), (1, 6), (6, 24), (24, 1e9)]:
            g = [c for d, c in opoznienia if lo < d <= hi or (lo == 0 and d == 0)]
            if g:
                print(f"  odpowiedź po {lo:g} do {hi:g} h: {len(g)} rozmów, do ceny doszło {sum(g)} ({100 * sum(g) // len(g)}%)")
    print(f"\nZostawili telefon albo e-mail, rozmowa stoi ponad 24 h ({len(kontakty)}):")
    for h, n, e, t, m in sorted(kontakty)[:40]:
        print(f"- {n} ({e}, {h / 24:.0f} dni): {t} {m}".rstrip())


if __name__ == "__main__":
    sys.exit(main())
