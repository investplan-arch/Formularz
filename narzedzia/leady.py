#!/usr/bin/env python3
"""Tablica leadów z Messengera strony Kapitałowni.

Pobiera rozmowy z Graph API (token w META_PAGE_ACCESS_TOKEN), ustala etap każdego
leada, obiekcje i następny krok, a potem drukuje raport dla właściciela.
Dane z imionami klientów zapisuje tylko lokalnie w ~/.cache/kapitalownia/leady.json,
nigdy w repozytorium.

Użycie:
    python3 narzedzia/leady.py            # rozmowy z ostatnich 21 dni
    python3 narzedzia/leady.py --dni 45   # dłuższy okres
    python3 narzedzia/leady.py --json     # sam JSON na stdout

Etapy (wzorowane na SalesGPT i AgentSDR, dopasowane do naszej ścieżki):
    zimny          nasza wiadomość do komentującego, brak odpowiedzi
    do_odpisania   ostatnia wiadomość jest od klienta
    kwalifikacja   rozmowa trwa, ceny jeszcze nie było
    cena           cena podana, linku jeszcze nie było
    link           link do płatności wysłany, klient nie potwierdził płatności
    zgloszona_platnosc  klient napisał, że zapłacił (sprawdzić w Stripe)
    zamkniety      klient odmówił albo zrezygnował
    spam           propozycje wymiany albo zakupu opinii (nie odpisujemy)
    nie_odpisujemy osoby z nie_odpisuj.json, decyzja właściciela (nigdy nie odpisujemy)
    czeka_na_klienta  klient zamknął wątek („Ok. Dam znać”), ruch po jego stronie
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

PAGE = os.environ.get("META_PAGE_ID") or "1235937636280516"
API = "https://graph.facebook.com/v21.0"
CACHE = Path.home() / ".cache" / "kapitalownia" / "leady.json"

CENA = re.compile(r"\b(1900|850|1050|990|1290|1200|1490|690|800|2490|3100|3900|149|249)\s?zł", re.I)
LINK = re.compile(r"buy\.stripe\.com/\S+", re.I)
OBIEKCJE = {
    "zaufanie": r"oszuk|popłynęł|naciągn|nie ma kontaktu|zapłaciłe?m? (już )?(komuś|firmie|raz)|pewnoś|gwarancj|"
                r"sprawdzę w krs|dane firmy|czy to bot|na miejscu|opini",
    "telefon": r"telefon|zadzwo|numer|rozmow|spotkan",
    "termin_naboru": r"kiedy (ruszy|będzie|nabór)|nabór|po nowym roku|w styczniu|w lutym|nie ma naboru|zamknięt",
    "chce_dotacji": r"(nie|bez) (chcę |chciał\w* )?pożycz|wolał\w* dotacj|tylko dotacj|bezzwrotn|nie chcę kredyt",
    "cena": r"drogo|budżet|nie stać|za dużo|nieosiągaln|ile kosztuj|koszt (waszej|państwa)|sam(a)? (napisz|spróbuj|opracuj)",
    "decyzja_z_kims": r"mąż|męża|żona|żony|wspólnik|zarząd|prezes|mam[aą]|koleżank|przemyśl|zastanowi|po weekendzie|dam znać|odezwę",
}
ODMOWA = re.compile(r"(nie jestem zainteresowan|rezygnuj|dziękuję,? (to )?nie|podziękuję|nie skorzystam|"
                    r"spróbuję sam|zrobię sam)", re.I)
ZAPLATA = re.compile(r"(wpłat\w*[^.?!]{0,20}(dokonan|poszł|zrobion)|zapłaciłe?a?m za|opłaciłe?a?m|"
                     r"przelew poszedł|już zapłacone|płatność (poszła|zrobiona))", re.I)
# Krótkie zamknięcie od klienta („Ok. Dam znać”, „Dziękuję”) nie czeka na odpowiedź.
ZAMKNIECIE = re.compile(r"^\W*(ok\W*|okej\W*|dobrze\W*|super\W*|dzięki\W*|)*(dam znać|odezwę się|odezwiemy się|dziękuję( bardzo)?|"
                        r"dziękujemy|pozdrawiam|do usłyszenia|przemyślę|zastanowię się)\W*$", re.I)
try:
    NIE_ODPISUJ = json.loads((Path(__file__).resolve().parent.parent / ".claude/skills/kapitalownia-asystent/nie_odpisuj.json")
                             .read_text())["osoby"]
except Exception:
    NIE_ODPISUJ = {}
# Osoby z nie_odpisuj.json (decyzja właściciela) dostają etap „nie_odpisujemy” i nie trafiają do list do odpisania.
SPAM = re.compile(r"(wymian\w* (się )?opini|zakup\w* opini|wymieni\w* (się )?opini|opinie za|polubienie za)", re.I)


def get(url, params=None):
    if params is not None:
        params["access_token"] = os.environ["META_PAGE_ACCESS_TOKEN"]
        url = url + "?" + urllib.parse.urlencode(params)
    for proba in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception:
            if proba == 2:
                raise
            time.sleep(2 * (proba + 1))


def czas(s):
    return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


def pobierz(dni):
    granica = datetime.now(timezone.utc) - timedelta(days=dni)
    rozmowy = []
    # Wiadomości pobieramy razem z rozmowami (pole zagnieżdżone), jedno zapytanie na 25 rozmów.
    d = get(f"{API}/{PAGE}/conversations", {
        "fields": "id,updated_time,participants,messages.limit(100){created_time,from,message}",
        "limit": "25"})
    while True:
        for c in d.get("data", []):
            if czas(c["updated_time"]) < granica:
                return rozmowy
            wiad = c.get("messages", {}).get("data", [])
            c["messages"] = sorted([w for w in wiad if (w.get("message") or "").strip()],
                                   key=lambda w: w["created_time"])
            rozmowy.append(c)
        nxt = d.get("paging", {}).get("next")
        if not nxt:
            return rozmowy
        d = get(nxt)


def ocen(c, teraz):
    ms = [m for m in c["messages"] if not m["message"].startswith("Odpowiadasz na komentarz")]
    if not ms:
        return None
    klient = next((p for p in c["participants"]["data"] if p["id"] != PAGE), {})
    nasze = [m for m in ms if m["from"]["id"] == PAGE]
    jego = [m for m in ms if m["from"]["id"] != PAGE]
    tekst_klienta = " ".join(m["message"] for m in jego).lower()
    ostatnia = ms[-1]
    od_ostatniej_h = (teraz - czas(ostatnia["created_time"])).total_seconds() / 3600
    od_klienta_h = (teraz - czas(jego[-1]["created_time"])).total_seconds() / 3600 if jego else None
    cena = any(CENA.search(m["message"]) for m in nasze)
    linki = [m for m in nasze if LINK.search(m["message"])]
    po_linku = [m for m in nasze if linki and m["created_time"] > linki[0]["created_time"]
                and not LINK.search(m["message"])]
    odp_po_linku = bool(linki) and any(m["created_time"] > linki[0]["created_time"] for m in jego)

    ostatnie_klienta = " ".join(m["message"] for m in jego[-3:])
    if klient.get("id") in NIE_ODPISUJ:
        etap = "nie_odpisujemy"
    elif not jego:
        etap = "zimny"
    elif SPAM.search(tekst_klienta):
        etap = "spam"
    elif ZAPLATA.search(ostatnie_klienta):
        etap = "zgloszona_platnosc"
    elif ODMOWA.search(" ".join(m["message"] for m in jego[-2:])):
        etap = "zamkniety"
    elif ostatnia["from"]["id"] != PAGE and ZAMKNIECIE.search(ostatnia["message"].strip()):
        etap = "czeka_na_klienta"
    elif ostatnia["from"]["id"] != PAGE:
        etap = "do_odpisania"
    elif linki:
        etap = "link"
    elif cena:
        etap = "cena"
    else:
        etap = "kwalifikacja"

    obiekcje = [k for k, w in OBIEKCJE.items() if re.search(w, tekst_klienta)]
    # Następny krok według lejka (lejek.md). Follow-up wolno wysłać tylko osobom,
    # które dostały link do płatności (CLAUDE.md), raz, i tylko w 24 h od ostatniej
    # wiadomości klienta, bo potem Meta blokuje wiadomości strony.
    krok = ""
    if etap in ("spam", "nie_odpisujemy", "zamkniety", "zimny", "czeka_na_klienta"):
        pass
    elif etap == "do_odpisania":
        krok = "odpisać teraz" if od_klienta_h < 24 else "okno 24 h minęło, odpowiedź tylko z tagiem HUMAN_AGENT"
    elif etap == "link" and od_klienta_h is not None and 3 <= od_klienta_h < 23 and not po_linku:
        krok = "follow-up przed zamknięciem okna 24 h"
    elif etap == "zgloszona_platnosc":
        krok = "sprawdzić wpłatę w Stripe i potwierdzić"
    elif "zaufanie" in obiekcje or "telefon" in obiekcje:
        krok = "zaufanie: umowa albo telefon właściciela"
    elif etap in ("cena", "kwalifikacja") and "termin_naboru" in obiekcje:
        krok = "czeka na nabór: wrócić, gdy klient się odezwie"
    return {
        "watek": c["id"],
        "psid": klient.get("id"),
        "klient": klient.get("name", "?"),
        "etap": etap,
        "obiekcje": obiekcje,
        "krok": krok,
        "wiadomosci": len(ms),
        "nasze": len(nasze),
        "klienta": len(jego),
        "cena": cena,
        "link": bool(linki),
        "odp_po_linku": odp_po_linku,
        "follow_upy_po_linku": len(po_linku),
        "h_od_ostatniej": round(od_ostatniej_h, 1),
        "h_od_klienta": round(od_klienta_h, 1) if od_klienta_h is not None else None,
        "okno_24h": od_klienta_h is not None and od_klienta_h < 24,
        "ostatnia_od": "my" if ostatnia["from"]["id"] == PAGE else "klient",
        "ostatnia": ostatnia["message"][:160].replace("\n", " "),
        "start": ms[0]["created_time"][:10],
    }


def raport(leady):
    from collections import Counter
    e = Counter(l["etap"] for l in leady)
    o = Counter(x for l in leady for x in l["obiekcje"])
    out = [f"Leady: {len(leady)} | " + ", ".join(f"{k} {v}" for k, v in e.most_common())]
    rozmawiali = [l for l in leady if l["klienta"] > 0]
    if rozmawiali:
        out.append(f"Lejek: odpisało {len(rozmawiali)}, cena {sum(l['cena'] for l in rozmawiali)}, "
                   f"link {sum(l['link'] for l in rozmawiali)}, "
                   f"zgłoszona płatność {e.get('zgloszona_platnosc', 0)}")
    out.append("Obiekcje: " + ", ".join(f"{k} {v}" for k, v in o.most_common()))

    def sekcja(tytul, lista, pole="h_od_klienta"):
        if not lista:
            return
        out.append(f"\n{tytul} ({len(lista)})")
        for l in sorted(lista, key=lambda x: -(x.get(pole) or 0))[:15]:
            okno = "" if l["okno_24h"] else " [po 24 h]"
            out.append(f"- {l['klient']} ({l['h_od_klienta']} h{okno}, {', '.join(l['obiekcje']) or 'brak obiekcji'}): "
                       f"{l['ostatnia'][:90]}")

    sekcja("Do odpisania teraz", [l for l in leady if l["krok"] == "odpisać teraz"])
    sekcja("Bez odpowiedzi ponad 24 h (stracone przez czas)", [l for l in leady if l["krok"].startswith("okno")])
    sekcja("Zgłoszona płatność, sprawdzić Stripe", [l for l in leady if l["etap"] == "zgloszona_platnosc"])
    sekcja("Follow-up teraz, zanim zamknie się okno 24 h", [l for l in leady if l["krok"].startswith("follow-up")])
    sekcja("Utknęli na zaufaniu albo chcą telefonu", [l for l in leady if l["krok"].startswith("zaufanie")])
    sekcja("Czekają na nabór", [l for l in leady if l["krok"].startswith("czeka")])
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dni", type=int, default=21)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if not os.environ.get("META_PAGE_ACCESS_TOKEN"):
        print("Brak META_PAGE_ACCESS_TOKEN w środowisku.", file=sys.stderr)
        return 1
    teraz = datetime.now(timezone.utc)
    leady = [l for l in (ocen(c, teraz) for c in pobierz(a.dni)) if l]
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps({"czas": teraz.isoformat(), "leady": leady}, ensure_ascii=False, indent=1))
    print(json.dumps(leady, ensure_ascii=False, indent=1) if a.json else raport(leady))
    return 0


if __name__ == "__main__":
    sys.exit(main())
