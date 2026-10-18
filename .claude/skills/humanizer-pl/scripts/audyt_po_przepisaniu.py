"""Bramka po przepisaniu: porownuje tekst przed redakcja i po niej.

Redakcja zmienia slowa, nie tresc. Bramka sprawdza deterministycznie (stdlib, bez sieci),
czy przy przepisaniu nie zginelo ani nie pojawilo sie nic, co niesie tresc:

  wejscie             - oba teksty niepuste; brak zmian to poprawny wynik, nie blad
  wartosci_wrazliwe   - multizbior: przepisy, daty, sygnatury, liczby i kwoty, cytaty,
                        pola do wypelnienia; brak albo nowa wartosc = BLOKADA
  profil_deontyczny   - liczba obowiazkow, zakazow, pozwolen i zalecen przed i po;
                        ramy dyskursu ("należy zauważyć", "warto") sie nie licza
  pewnosc             - usuniete "prawdopodobnie"/"wstepnie" bez sladu niepewnosci = BLOKADA;
                        przerzedzenie pietrowego asekuranctwa jest dozwolone
  slady_narzedzia    - niewypelnione pola i formulki czatu w wyniku = tekst niegotowy
  terminy_chronione   - terminy prawne, terminy zdefiniowane w tekscie i podane parametrem
                        (doslownie); zamiana na "synonim" = BLOKADA
  limit_skrocenia     - ubytek slow ponad limit (domyslnie 30%) = BLOKADA; limit to sufit,
                        nie cel

Wynik to trojstan OK / UWAGI / BLOKADA z pelnym mianownikiem (kazda kontrola w raporcie,
takze zdana). Kod wyjscia: 0 OK, 10 UWAGI, 20 BLOKADA, 2 zle wywolanie.

Uzycie:  python audyt_po_przepisaniu.py PRZED.txt PO.txt [--limit 0.3]
             [--chronione "termin1;termin2"] [--json]
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

KONTROLE = ("wejscie", "wartosci_wrazliwe", "profil_deontyczny", "pewnosc", "slady_narzedzia",
            "terminy_chronione", "limit_skrocenia")
KROTKI_TEKST = 40  # ponizej tylu slow limit skrocenia jest orientacyjny (UWAGI), nie twardy
POZIOM = {"OK": 0, "UWAGI": 1, "BLOKADA": 2}
KOD = {"OK": 0, "UWAGI": 10, "BLOKADA": 20}

MIESIACE = {m: i for i, m in enumerate(
    ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia",
     "września", "października", "listopada", "grudnia"], start=1)}

L = r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]"  # litera polska
GR = rf"(?<!{L})"  # granica slowa od lewej, odporna na polskie litery
GP = rf"(?!{L})"   # granica slowa od prawej

# --- normalizacja -------------------------------------------------------------------------

def norm(t: str) -> str:
    t = unicodedata.normalize("NFC", t)
    t = re.sub(r"[‐-―−]", "-", t)
    t = re.sub(r"[   \t\r\n ]+", " ", t)
    return t.strip()


def slowa(t: str) -> list:
    return re.findall(r"\w+", t)

# --- wartosci wrazliwe --------------------------------------------------------------------

RE_CYTAT = re.compile(r"„([^”\"]{2,400})[”\"]|\"([^\"„”]{2,400})\"|»([^«]{2,400})«")
RE_ZNACZNIK = re.compile(r"\[do uzupe(?:ł|l)nienia:[^\]\n]*\]", re.I)  # znacznik skilla: nie wartosc, ale tekst niegotowy
# pole do wypelnienia ma litere: przypis "[1]" i "[2026]" to nie pola
RE_POLE = re.compile(r"\[(?=[^\]\n]*[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])[^\]\n]{1,60}\]|\{\{[^}\n]{1,60}\}\}|<[^<>\n]{1,40}>")
RE_PRZEPIS = re.compile(
    GR + r"(?:art\.|§|ust\.|pkt)\s*\d+\w*(?:\^?\d+)?"
    r"(?:\s*(?:§|ust\.|pkt|lit\.|zd\.|zdanie)\s*\d*\w*(?:\^?\d+)?)*", re.I)
RE_SYGN = re.compile(rf"{GR}[IVXL]{{1,5}}\s+[A-Z][A-Za-z]{{0,5}}(?:\s+[A-Z][a-z]{{0,3}})?\s+\d+/\d{{2,4}}{GP}")
RE_ECLI = re.compile(r"ECLI:[A-Z]{2}:[A-Z0-9.]+:\d{4}:[A-Z0-9.]+")
RE_DATA_SLOWNA = re.compile(rf"{GR}(\d{{1,2}})\s+({'|'.join(MIESIACE)})\s+(\d{{4}}){GP}", re.I)
RE_DATA_KROPKI = re.compile(r"(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)")
RE_DATA_ISO = re.compile(r"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)")
RE_LICZBA = re.compile(r"(?<![\d,])\d{1,3}(?: \d{3})+(?:,\d+)?(?!\d)|(?<![\d,])\d+(?:[.,]\d+)?(?!\d)")


def _maskuj(t: str, rx, znalezione: list, etykieta, kanon=lambda m: norm(m.group(0))):
    def zamien(m):
        znalezione.append((etykieta, kanon(m)))
        return " \u0000 "
    return rx.sub(zamien, t)


def wartosci(t: str) -> Counter:
    """Multizbior wartosci, ktorych redakcja nie moze zgubic ani dopisac."""
    t = RE_ZNACZNIK.sub(" ", norm(t))
    zn = []
    t = _maskuj(t, RE_CYTAT, zn, "cytat",
                lambda m: norm(next(g for g in m.groups() if g is not None)))
    t = _maskuj(t, RE_POLE, zn, "pole")
    t = _maskuj(t, RE_ECLI, zn, "ECLI")
    t = _maskuj(t, RE_SYGN, zn, "sygnatura", lambda m: re.sub(r"\s+", " ", m.group(0)))
    t = _maskuj(t, RE_PRZEPIS, zn, "przepis", lambda m: re.sub(r"\s+", "", m.group(0).lower()))
    t = _maskuj(t, RE_DATA_SLOWNA, zn, "data", lambda m: "%s-%02d-%02d" % (
        m.group(3), MIESIACE[m.group(2).lower()], int(m.group(1))))
    t = _maskuj(t, RE_DATA_KROPKI, zn, "data", lambda m: "%s-%02d-%02d" % (
        m.group(3), int(m.group(2)), int(m.group(1))))
    t = _maskuj(t, RE_DATA_ISO, zn, "data", lambda m: m.group(0))
    _maskuj(t, RE_LICZBA, zn, "liczba", lambda m: m.group(0).replace(" ", ""))
    return Counter(zn)

# --- profil deontyczny --------------------------------------------------------------------

RAMY = [r"należy\s+(?:(?:jednak|też|także|przy\s+tym|zatem|więc|również)\s+)?"
        r"(?:zauważyć|podkreślić|zaznaczyć|pamiętać|wskazać|dodać|przypomnieć|odnotować)",
        r"warto\s+\w+", r"być\s+może", r"może\s+się\s+wydawać"]
NEG = {
    "pozwolenie": [r"nie\s+musi\w*", r"nie\s+trzeba", r"nie\s+ma\s+obowiązku", r"nie\s+mają\s+obowiązku",
                   r"nie\s+jest\s+(?:obowiązan|zobowiązan)\w*"],
    "zakaz": [r"nie\s+(?:może|mogą|można|mogę|możesz|możemy|wolno)", r"nie\s+ma(?:ją)?\s+prawa",
              r"nie\s+jest\s+(?:dozwolon|dopuszczaln|uprawnion)\w*", r"nie\s+są\s+(?:dozwolon|dopuszczaln|uprawnien)\w*"],
}
POZ = {
    "zakaz": [r"zakazuje\s+się", r"zabrania\s+się", r"zakazan\w*", r"zabronion\w*"],
    "obowiazek": [r"musi\w*", r"muszą", r"musimy", r"należy", r"trzeba",
                  r"(?:jest|są|będzie|będą)\s+(?:obowiązan|zobowiązan)\w*", r"ma(?:ją)?\s+obowiązek",
                  r"zobowiązuje\s+się", r"zobowiązują\s+się", r"obowiązan\w*"],
    "pozwolenie": [r"może", r"mogą", r"można", r"mogę", r"możesz", r"możemy", r"wolno",
                   r"ma(?:ją)?\s+prawo", r"(?:jest|są)\s+uprawnion\w*", r"uprawnion\w*",
                   r"(?:jest|są)\s+dozwolon\w*", r"dopuszczaln\w*"],
    "zalecenie": [r"powin\w+", r"zaleca\s+się", r"rekomenduje\s+się"],
}


def _rx(wzorce):
    return re.compile(GR + "(?:" + "|".join(wzorce) + ")" + GP, re.I)


def profil_deontyczny(t: str) -> dict:
    t = norm(t)
    t = _rx(RAMY).sub(" ", t)
    wynik = Counter({k: 0 for k in ("obowiazek", "zakaz", "pozwolenie", "zalecenie")})
    for kat, wz in NEG.items():
        rx = _rx(wz)
        wynik[kat] += len(rx.findall(t))
        t = rx.sub(" ", t)
    for kat, wz in POZ.items():
        rx = _rx(wz)
        wynik[kat] += len(rx.findall(t))
        t = rx.sub(" ", t)
    return dict(wynik)

# --- pewnosc ------------------------------------------------------------------------------

RE_NIEPEWNOSC = re.compile(GR + "(?:" + "|".join([
    r"prawdopodobn\w*", r"przypuszczaln\w*", r"najpewniej", r"zapewne", r"być\s+może", r"chyba",
    r"raczej", r"wstępn\w*", r"szacunkow\w*", r"orientacyjn\w*", r"około", r"ok\.", r"mniej\s+więcej",
    r"nie\s+wiadomo", r"nie\s+jest\s+(?:jasne|pewne|przesądzone)", r"wydaje\s+się", r"możliwe",
    r"potencjaln\w*", r"niewykluczone",
]) + ")" + GP, re.I)
RE_MOZE = re.compile(GR + r"(?:może|mogą|można|mógł\w*|mogł\w*)" + GP, re.I)


def niepewnosc(t: str) -> int:
    return len(RE_NIEPEWNOSC.findall(norm(t)))

# --- slady narzedzia ----------------------------------------------------------------------

FORMULKI_STARTU = re.compile(
    r"^\s*(?:oto\b|jasne[!,.]|oczywiście[!,.]|świetne pytanie|poniżej (?:znajdziesz|przedstawiam))", re.I)
FORMULKI = re.compile(
    r"mam nadzieję, że (?:to|ta|ten|powyższ)\w* (?:pomo|był|okaż)\w*|daj(?:cie)? znać|"
    r"czy chciał(?:byś|abyś|aby pan|aby pani)|jako (?:model językowy|asystent ai|sztuczna inteligencja)|"
    r"chętnie (?:pomogę|rozwinę|przygotuję)", re.I)  # "w razie pytań jestem do dyspozycji" pisze tez czlowiek w mailu
OFERTA = re.compile(
    r"możesz (?:go |je |ją |to |tekst |pismo )?(?:dostosować|zmodyfikować|wykorzystać|użyć|skopiować|"
    r"uzupełnić|edytować|wkleić)|mogę (?:też |również |także |ci |pani |panu )*(?:przygotować|rozwinąć|"
    r"dopisać|pomóc|zmienić|skrócić|przetłumaczyć)|(?:jeśli|gdybyś|gdyby) (?:chcesz|chciał\w*|potrzebujesz)", re.I)
DISCLAIMER = re.compile(r"nie stanowi porady prawnej", re.I)


def bez_otoczki(t: str) -> str:
    """Tekst bez zdan-otoczki czatu ("Oto...", "Możesz dostosować...", "Mam nadzieję...").

    Modalnosci i terminy z otoczki nie sa trescia dokumentu: ich usuniecie nie zmienia
    normy ani terminologii, wiec nie moze dawac BLOKADY profilu.
    """
    zdania = re.split(r"(?<=[.!?:])\s+", norm(t))
    return " ".join(z for z in zdania if not (FORMULKI_STARTU.match(z) or FORMULKI.search(z) or OFERTA.search(z)))

# --- terminy chronione --------------------------------------------------------------------

# Pary i grupy, ktore laik bierze za synonimy, a prawo nie. Klucz = nazwa, wartosc = rdzen.
TERMINY = {
    "zadatek": r"zadat\w*", "zaliczka": r"zaliczk\w*|zaliczce|zaliczek",
    "odstąpienie": r"odstąpi\w*|odstępuj\w*", "wypowiedzenie": r"wypowiedze\w*|wypowiedzie\w*|wypowiada\w*",
    "rozwiązanie umowy": r"rozwiąza\w*\s+umow\w*|rozwiązuj\w*\s+umow\w*",
    "rękojmia": r"rękojm\w*", "gwarancja": r"gwaranc\w*",
    "nieważność": r"nieważn\w*", "bezskuteczność": r"bezskuteczn\w*",
    "kara umowna": r"kar\w*\s+umown\w*", "odszkodowanie": r"odszkodowa\w*",
    "zadośćuczynienie": r"zadośćuczynie\w*",
    "przedawnienie": r"przedawni\w*", "prekluzja": r"prekluzj\w*|zawit\w*",
    "potrącenie": r"potrące\w*|potrąci\w*", "kompensata": r"kompensat\w*",
    "przelew wierzytelności": r"przelew\w*\s+wierzyteln\w*", "cesja": r"cesj\w*",
    "pełnomocnictwo": r"pełnomocnictw\w*", "prokura": r"prokur(?:a|y|ę|ą|ze)" + GP,
    "upoważnienie": r"upoważnie\w*", "poręczenie": r"poręcze\w*|poręczy\w*",
    "wyrok": r"wyrok\w*", "postanowienie sądu": r"postanowieni\w*\s+sąd\w*", "nakaz zapłaty": r"nakaz\w*\s+zapłaty",
    "apelacja": r"apelacj\w*", "zażalenie": r"zażale\w*", "skarga kasacyjna": r"skarg\w*\s+kasacyjn\w*",
    "najem": r"najm\w*|najem" + GP, "dzierżawa": r"dzierżaw\w*", "użyczenie": r"użycze\w*",
    "umowa o dzieło": r"umow\w*\s+o\s+dzieło", "umowa zlecenia": r"umow\w*\s+zlecenia",
    "umowa o pracę": r"umow\w*\s+o\s+pracę",
    "odsetki": r"odset\w*", "kaucja": r"kaucj\w*",
}
_TERMINY_RX = {k: re.compile(GR + "(?:" + v + ")", re.I) for k, v in TERMINY.items()}
RE_DEFINICJA = re.compile(
    r"(?:dalej(?:\s+zwan\w*)?\s*:?|zwan\w*\s+dalej|zwan\w*)\s*[„\"]([^”\"]{2,40})[”\"]"
    r"|[„\"]([^”\"]{2,40})[”\"]\s*(?:-\s*)?(?:oznacza|oznaczają|rozumie się)", re.I)


def _rdzen(termin: str) -> str:
    """Rdzen do zliczania odmiany terminu zdefiniowanego ("Zamawiający" -> "Zamawiając")."""
    if " " in termin or len(termin) < 5:
        return re.escape(termin)
    utnij = 2 if len(termin) >= 7 else 1
    return re.escape(termin[:-utnij]) + rf"{L}*"


def terminy_zdefiniowane(t: str) -> list:
    out = []
    for m in RE_DEFINICJA.finditer(norm(t)):
        term = (m.group(1) or m.group(2)).strip()
        if term and term not in out:
            out.append(term)
    return out


def _licz_doslownie(t: str, rdzen: str) -> int:
    return len(re.findall(GR + rdzen + GP, t))

# --- audyt --------------------------------------------------------------------------------

def _k(nazwa, status, szczegoly):
    return {"nazwa": nazwa, "status": status, "szczegoly": szczegoly}


def audyt(przed: str, po: str, limit_skrocenia: float = 0.30, chronione=()) -> dict:
    a, b = norm(przed or ""), norm(po or "")
    kontrole = []
    if not a or not b:
        kontrole.append(_k("wejscie", "BLOKADA",
                           "pusty tekst " + ("przed redakcja" if not a else "po redakcji")
                           + " - nie ma czego porownac, to nie jest wynik pozytywny"))
        for n in KONTROLE[1:]:
            kontrole.append(_k(n, "BLOKADA", "nie wykonano: puste wejscie"))
        return {"status": "BLOKADA", "bez_zmian": False, "kontrole": kontrole}

    bez_zmian = a == b
    kontrole.append(_k("wejscie", "OK", "brak zmian - poprawny wynik, gdy tekst nie wymagal redakcji"
                       if bez_zmian else f"slow przed: {len(slowa(a))}, po: {len(slowa(b))}"))

    wa, wb = wartosci(a), wartosci(b)
    zniknelo, doszlo = wa - wb, wb - wa
    if zniknelo or doszlo:
        opis = []
        if zniknelo:
            opis.append("zniknelo: " + "; ".join(f"{e} {v}" for (e, v) in sorted(zniknelo.elements())))
        if doszlo:
            opis.append("pojawilo sie: " + "; ".join(f"{e} {v}" for (e, v) in sorted(doszlo.elements())))
        kontrole.append(_k("wartosci_wrazliwe", "BLOKADA", " | ".join(opis)))
    else:
        kontrole.append(_k("wartosci_wrazliwe", "OK", f"zgodne: {sum(wa.values())} wartosci"))

    ta, tb = bez_otoczki(a), bez_otoczki(b)  # otoczka czatu nie jest trescia dokumentu
    pa, pb = profil_deontyczny(ta), profil_deontyczny(tb)
    rozne = {k: (pa[k], pb[k]) for k in pa if pa[k] != pb[k]}
    if rozne:
        kontrole.append(_k("profil_deontyczny", "BLOKADA",
                           "zmienila sie sila normy albo pewnosc: " + ", ".join(
                               f"{k} {x}->{y}" for k, (x, y) in rozne.items())
                           + " (sprawdz kazde 'moze', 'musi', 'nie wolno', 'powinien')"))
    else:
        kontrole.append(_k("profil_deontyczny", "OK", ", ".join(f"{k} {v}" for k, v in pa.items())))

    na_, nb_ = niepewnosc(ta), niepewnosc(tb)
    if na_ and not nb_ and not RE_MOZE.search(b):
        kontrole.append(_k("pewnosc", "BLOKADA", f"znaczniki niepewnosci {na_}->0: tekst twierdzi "
                           "pewniej niz oryginal ('prawdopodobnie', 'wstepnie' to tresc, nie wata)"))
    elif nb_ > na_:
        kontrole.append(_k("pewnosc", "UWAGI", f"dopisana niepewnosc {na_}->{nb_} - czy oryginal jej nie mial celowo?"))
    else:
        kontrole.append(_k("pewnosc", "OK", f"znaczniki niepewnosci {na_}->{nb_}"
                           + (" (przerzedzone asekuranctwo, niepewnosc zostala)" if nb_ < na_ else "")))

    slady = [m.group(0) for m in RE_ZNACZNIK.finditer(b)]
    slady += [m.group(0) for m in RE_POLE.finditer(RE_ZNACZNIK.sub(" ", b))]
    slady += [m.group(0).strip() for m in FORMULKI_STARTU.finditer(b)]
    slady += [m.group(0) for m in FORMULKI.finditer(b)]
    slady += [m.group(0) for m in OFERTA.finditer(b)]
    if slady:
        kontrole.append(_k("slady_narzedzia", "BLOKADA",
                           "tekst niegotowy do wyslania: " + "; ".join(slady)
                           + " (pola wypelnia czlowiek - nie zmyslaj wartosci; formulki czatu usun)"))
    elif DISCLAIMER.search(b) and not DISCLAIMER.search(a):
        kontrole.append(_k("slady_narzedzia", "UWAGI", "dopisane 'nie stanowi porady prawnej' - czy celowo?"))
    else:
        kontrole.append(_k("slady_narzedzia", "OK", "brak pol do wypelnienia i formulek czatu"))

    blok, uwagi = [], []
    for nazwa, rx in _TERMINY_RX.items():
        x, y = len(rx.findall(ta)), len(rx.findall(tb))
        if (x == 0) != (y == 0):
            blok.append(f"{nazwa} {x}->{y}")
        elif x != y:
            uwagi.append(f"{nazwa} {x}->{y}")
    for term in list(terminy_zdefiniowane(a)) + [c for c in chronione if c]:
        x, y = _licz_doslownie(ta, _rdzen(term)), _licz_doslownie(tb, _rdzen(term))
        if x and not y:
            blok.append(f"„{term}” {x}->0")
        elif x != y:
            uwagi.append(f"„{term}” {x}->{y}")
    if blok:
        kontrole.append(_k("terminy_chronione", "BLOKADA", "termin zniknal albo pojawil sie zamiast innego: "
                           + "; ".join(blok) + ("; uwagi: " + "; ".join(uwagi) if uwagi else "")))
    elif uwagi:
        kontrole.append(_k("terminy_chronione", "UWAGI", "zmienila sie liczba uzyc: " + "; ".join(uwagi)))
    else:
        kontrole.append(_k("terminy_chronione", "OK", "terminy bez zmian"))

    # liczone bez otoczki czatu: wyciecie "Oto..." / "Mam nadzieje..." to nie ubytek, a liczenie
    # go popycha redaktora do zostawiania waty tylko po to, zeby zmiescic sie w limicie
    na, nb = len(slowa(ta)), len(slowa(tb))
    ubytek = (na - nb) / na if na else 0.0
    if ubytek > limit_skrocenia:
        krotki = na < KROTKI_TEKST
        kontrole.append(_k("limit_skrocenia", "UWAGI" if krotki else "BLOKADA",
                           f"ubytek {ubytek:.0%} > limit {limit_skrocenia:.0%} - krotszy tekst nie jest celem"
                           + (f" (tekst ponizej {KROTKI_TEKST} slow: limit orientacyjny, fakty pilnuje"
                              " kontrola wartosci)" if krotki else "")))
    else:
        kontrole.append(_k("limit_skrocenia", "OK", f"zmiana dlugosci {-ubytek:+.0%} (limit ubytku {limit_skrocenia:.0%})"))

    status = max((k["status"] for k in kontrole), key=POZIOM.get)
    return {"status": status, "bez_zmian": bez_zmian, "kontrole": kontrole}


def raport(w: dict) -> str:
    licz = Counter(k["status"] for k in w["kontrole"])
    linie = [f"AUDYT PO PRZEPISANIU: {w['status']} (kontroli {len(w['kontrole'])}: "
             f"OK {licz['OK']}, UWAGI {licz['UWAGI']}, BLOKADA {licz['BLOKADA']})"]
    linie += [f"  [{k['status']}] {k['nazwa']}: {k['szczegoly']}" for k in w["kontrole"]]
    return "\n".join(linie)


def main(argv=None) -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    p = argparse.ArgumentParser(description="Bramka po przepisaniu (humanizer-pl)")
    p.add_argument("przed")
    p.add_argument("po")
    p.add_argument("--limit", type=float, default=0.30, help="maks. ubytek slow (0-1), domyslnie 0.30")
    p.add_argument("--chronione", default="", help="terminy chronione doslownie, rozdzielone ';'")
    p.add_argument("--json", action="store_true")
    a = p.parse_args(argv)
    w = audyt(Path(a.przed).read_text(encoding="utf-8"), Path(a.po).read_text(encoding="utf-8"),
              limit_skrocenia=a.limit, chronione=[c.strip() for c in a.chronione.split(";")])
    print(json.dumps(w, ensure_ascii=False, indent=1) if a.json else raport(w))
    return KOD[w["status"]]


if __name__ == "__main__":
    sys.exit(main())
