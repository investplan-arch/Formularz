"""Sprawdzanie faktów w wiadomościach do klientów (właściciel 4.11.2026: „nie sprawdzasz informacji”).

Każda liczba z jednostką (zł, tys., euro, %, miesiące, lata, dni, krotność), każda data
i każde twierdzenie o naborze albo o warunku programu musi mieć źródło:
- trwały fakt z `.claude/skills/kapitalownia-asystent/fakty.json` (regulamin, cennik), albo
- fakt sprawdzony w tej sprawie i zapisany przez `narzedzia/fakt.py dodaj` (lokalnie
  w ~/.cache/kapitalownia/fakty_sesja.jsonl), albo
- liczba, którą podał sam klient w tej rozmowie.
Nasze wcześniejsze wiadomości NIE są źródłem, bo mogły zawierać błąd.
"""
import json
import re
import time
from datetime import date, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TRWALE = REPO / ".claude" / "skills" / "kapitalownia-asystent" / "fakty.json"
SESJA = Path.home() / ".cache" / "kapitalownia" / "fakty_sesja.jsonl"

MIESIACE = "stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia"
LICZBA = r"(\d{1,3}(?:[  ]\d{3})+|\d+(?:,\d+)?)"
JEDNOSTKA = (r"(-?\s?krotno\w*|-?\s?krotn\w*|tys\.?\s?zł|tys\.?\s?euro|tys\.?|mln\s?zł|mln|zł|euro|%|proc\w*|"
             r"ha\b|miesi\w*|mies\.|lat\w*|lata|roku|dni|dzień|tygodni\w*|tydzień|godzin\w*)")
TOKEN = re.compile(LICZBA + r"\s?" + JEDNOSTKA, re.I)
DATA = re.compile(r"\b(\d{1,2})\s(" + MIESIACE + r")\b", re.I)
NABOR = re.compile(
    r"(nab[oó]r\w*\s+(\w+\s+){0,2}(rusz\w*|trwa|jest otwart\w*|otwier\w*|zamkni\w*|zamyk\w*|zakończ\w*|ogłosz\w*|"
    r"ogłasza\w*|planowan\w*|ma ruszyć|będzie)|kolejn\w* nab[oó]r|najbliższ\w* nab[oó]r|wnioski (są )?przyjmowan\w*|"
    r"przyjmuj\w* wnioski|skończyły się (pieniądze|środki)|pula (się )?wyczerpa)", re.I)
WARUNEK = re.compile(
    r"\b(regulamin\w*|warun\w*|wymag\w*|nie (można|wolno|przysługuje|da się)|można (dostać|umorzyć|złożyć|sfinansować|"
    r"kupić|przeznaczyć|pokryć)|przysługuj\w*|dopuszcza\w*|wyklucz\w*|blokuje|odpada|kwalifikuj\w*|uprawnion\w*|"
    r"niekwalifikowaln\w*|umorzeni\w*|limit\w*)\b", re.I)


def norm_jednostka(j):
    j = j.lower().replace(" ", " ").strip().lstrip("-").strip()
    if j.startswith("krotn"):
        return "x"
    if j.startswith("tys") and "euro" in j:
        return "tys euro"
    if j.startswith("tys") and "zł" in j:
        return "tys zł"
    if j.startswith("tys"):
        return "tys"
    if j.startswith("mln"):
        return "mln"
    if j.startswith("proc") or j == "%":
        return "%"
    if j.startswith("miesi") or j.startswith("mies"):
        return "mies"
    if j.startswith("lat") or j in ("lata", "roku"):
        return "lat"
    if j in ("dni", "dzień"):
        return "dni"
    if j.startswith("tydz") or j.startswith("tygod"):
        return "tyg"
    if j.startswith("godzin"):
        return "godz"
    return j


def tokeny(tekst):
    """Zbiór faktów liczbowych z tekstu w postaci znormalizowanej, np. {'850 zł', '28 grudnia'}."""
    t = re.sub(r"https?://\S+", " ", tekst or "")
    wynik = set()
    for m in TOKEN.finditer(t):
        liczba = re.sub(r"[  ]", "", m.group(1))
        wynik.add(f"{liczba} {norm_jednostka(m.group(2))}")
    for m in DATA.finditer(t):
        wynik.add(f"{int(m.group(1))} {m.group(2).lower()}")
    return wynik


def _waznosc_ok(f, teraz):
    do = f.get("wazne_do")
    if do:
        try:
            return date.fromisoformat(do) >= date.fromtimestamp(teraz)
        except ValueError:
            return False
    sprawdzono = f.get("sprawdzono")
    dni = f.get("waznosc_dni", 365)
    try:
        return (teraz - datetime.fromisoformat(sprawdzono).timestamp()) / 86400 <= dni
    except Exception:
        return False


def fakty(psid=None, teraz=None):
    """Trwałe fakty z fakty.json i fakty sesji (dla tego klienta albo ogólne), które są ważne."""
    teraz = teraz or time.time()
    lista = []
    try:
        lista += [dict(f, rodzaj="trwały") for f in json.loads(TRWALE.read_text())["fakty"]]
    except Exception:
        pass
    try:
        for linia in SESJA.read_text().splitlines():
            f = json.loads(linia)
            if f.get("psid") and psid and f["psid"] != str(psid):
                continue
            if f.get("psid") and not psid:
                continue
            lista.append(dict(f, rodzaj="sesja"))
    except Exception:
        pass
    return [f for f in lista if _waznosc_ok(f, teraz)]


def pokryte(f):
    return {w for v in f.get("wartosci", []) for w in (tokeny(v) or {v.lower()})}


def sprawdz(tekst, psid=None, klient_teksty=(), teraz=None):
    """Lista braków: fakty z wiadomości bez źródła."""
    teraz = teraz or time.time()
    zbior = fakty(psid, teraz)
    znane = set().union(*[pokryte(f) for f in zbior]) if zbior else set()
    od_klienta = set().union(*[tokeny(k) for k in klient_teksty]) if klient_teksty else set()
    braki = []
    bez = sorted(tokeny(tekst) - znane - od_klienta)
    if bez:
        braki.append("liczby albo daty bez sprawdzonego źródła: " + ", ".join(f"„{b}”" for b in bez))
    t = tekst.lower()
    if NABOR.search(tekst):
        ok = any("nabor" in f.get("tagi", []) and (
            f["rodzaj"] == "sesja" or any(s.lower() in t for s in f.get("slowa", []))) for f in zbior)
        if not ok:
            braki.append("twierdzenie o naborze („" + NABOR.search(tekst).group(0) + "”) bez sprawdzenia aktualnego "
                         "ogłoszenia w ostatnich dniach")
    if WARUNEK.search(tekst):
        ok = any(f["rodzaj"] == "sesja" and f.get("psid") == str(psid) for f in zbior) or any(
            f["rodzaj"] == "trwały" and "warunek" in f.get("tagi", []) and any(s.lower() in t for s in f.get("slowa", []))
            for f in zbior)
        if not ok:
            braki.append("warunek programu („" + WARUNEK.search(tekst).group(0) + "”) bez sprawdzenia w regulaminie "
                         "dla tej sprawy")
    return braki


def poprawne_zrodlo(z):
    if re.match(r"https?://\S+\.\S+", z or ""):
        return True
    sciezka = (z or "").split(":")[0]
    return bool(sciezka) and (REPO / sciezka).exists()
