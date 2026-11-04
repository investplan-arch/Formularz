#!/usr/bin/env python3
"""Hook PreToolUse dla mcp__meta-inbox__send_message.

Blokuje wiadomość do klienta, która łamie zasady z styl.md i messenger.md
(audyt skrzynki 29.10.2026). Kod wyjścia 2 zatrzymuje wysyłkę, a treść
ze stderr wraca do Claude jako powód.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    import fakty_lib  # noqa: E402  (właściciel 4.11.2026: każdy fakt ze źródłem)
except Exception:  # brak biblioteki nie może wyłączyć pozostałych kontroli
    fakty_lib = None

DZIENNIK = Path.home() / ".cache" / "kapitalownia" / "wyslane.jsonl"
ODCZYTY = Path.home() / ".cache" / "kapitalownia" / "odczyty.jsonl"
WATEK = None
KLIENT_TEKSTY = []
OSTATNIA_KLIENTA = None
ILE = 0

LIMIT = 220
LIMIT_Z_CENA = 320
ZDANIA = 2
ZDANIA_Z_CENA = 3
ZAKAZANE = [
    "zwykle", "chętnie pomog", "proszę dać znać", "śmiało", "nie ma problemu",
    "jak najbardziej", "oczywiście", "świetne pytanie", "dziękuję za wiadomość",
    "przepraszam, nie ten",
]
CENA = re.compile(r"\b(1900|850|1050|990|1290|1200|1490|690|800|2490|3100|3900|149|249)\s?zł", re.I)
# Analiza 398 rozmów (3.11.2026): słowa pisane bez polskich znaków, wymiany opinii,
# link przed ceną i pytania o formularz do osób, które nie zapłaciły.
BEZ_OGONKOW = re.compile(
    r"\b(ktory|ktora|ktore|ktorych|juz|sie|moze|mozna|prosze|dziekuje|dziekujemy|wiecej|bedzie|"
    r"bedziemy|poszlo|zaplacic|platnosc|zl|tez|rowniez|takze|pozyczk\w*|urzad\w*|wlasn\w*|srodk\w*|"
    r"wylacznie|swietnie|wczesniej|pozniej|zrobic|kazd\w*|jezeli|wazn\w*)\b", re.I)
OPINIE = re.compile(r"(wymian\w* (opini|polub|obserw|komentarz)|opini\w* za opini|polubienie za|"
                    r"obserwacj\w* i \d+ komentarz|wystaw\w* (nam )?(opini|recenzj)\w* (za|w zamian))", re.I)
FORMULARZ_PYTANIE = re.compile(r"czy (już )?wypełnia\w*\s+(Pan|Pani|Państwo)?\s*formularz", re.I)
STRIPE = re.compile(r"buy\.stripe\.com/\S+|kapitalownia\.pl/platnosc", re.I)
ZWROT = re.compile(r"\bPani?e?\s+([A-ZŁŚŻŹĆŃÓ][a-ząęóśłżźćń]+)")
ZACZYNAMY = re.compile(r"zaczynamy\?", re.I)
OTWARCIA = ("w takim razie", "jasne", "to dobry")


def rozmowa(psid):
    """Imię odbiorcy i nasze dotychczasowe wiadomości do niego (Graph API)."""
    token = os.environ.get("META_PAGE_ACCESS_TOKEN")
    page = os.environ.get("META_PAGE_ID") or "1235937636280516"
    if not token:
        return None, None
    url = f"https://graph.facebook.com/v21.0/{page}/conversations?" + urllib.parse.urlencode({
        "user_id": psid,
        "fields": "id,participants,messages.limit(100){from,message,created_time}",
        "access_token": token,
    })
    try:
        dane = json.load(urllib.request.urlopen(url, timeout=15))["data"]
    except Exception:
        return None, None
    if not dane:
        return None, []
    watek = dane[0]
    imie = next((p["name"] for p in watek["participants"]["data"] if p["id"] == psid), None)
    wiad = watek.get("messages", {}).get("data", [])
    nasze = [m.get("message", "") for m in wiad if m["from"]["id"] == page]
    klienta = [m.get("created_time") for m in wiad if m["from"]["id"] != page]
    global WATEK, OSTATNIA_KLIENTA, ILE, KLIENT_TEKSTY
    KLIENT_TEKSTY = [m.get("message", "") for m in wiad if m["from"]["id"] != page]
    WATEK = watek.get("id")
    # Liczymy wiadomości do ostatniej wiadomości klienta włącznie; nasze późniejsze
    # odpowiedzi nie unieważniają odczytu.
    idx = next((i for i, m in enumerate(wiad) if m["from"]["id"] != page), 0)
    ILE = len(wiad) - idx
    OSTATNIA_KLIENTA = klienta[0] if klienta else None
    return imie, nasze


def bledy(tekst, psid):
    b = []
    t = tekst.lower()
    bez_linkow = re.sub(r"https?://\S+", "", tekst)
    ma_cene = bool(CENA.search(tekst))
    ma_link = bool(STRIPE.search(tekst))

    if not (ma_link and len(bez_linkow.strip()) < 120):
        limit = LIMIT_Z_CENA if ma_cene else LIMIT
        if len(tekst) > limit:
            b.append(f"za długa ({len(tekst)} znaków, limit {limit}); skróć do jednej sprawy i jednego pytania")
    # Właściciel 1.11.2026: „piszesz jak bot”. Jak człowiek, czyli krótko i jedna sprawa.
    zdania = len([z for z in re.split(r"(?<=[.?!])\s+", re.sub(r"\b(np|ok|tys|mln|r|ul|m\.in|tj|itd|godz|pkt|nr|zł)\.", r"\1", re.sub(r"^dzień dobry[.,!]?\s*", "", bez_linkow.strip(), flags=re.I))) if len(z) > 3])
    if zdania > (ZDANIA_Z_CENA if ma_cene else ZDANIA):
        b.append(f"{zdania} zdań; najwyżej {ZDANIA_Z_CENA if ma_cene else ZDANIA}, odpowiedz tylko na pytanie i zadaj jedno")
    # Wzorce AI z humanizer (blader/humanizer, iamanimesh9044/humanize-skill), 1.11.2026.
    if re.search(r"\bnie tylko\b.{0,60}\b(ale|lecz)\b", t):
        b.append("konstrukcja „nie tylko… ale”; powiedz to wprost")
    if re.search(r"\w+, \w+(,| i| oraz) \w+(,| i| oraz) \w+", bez_linkow) and not ma_cene:
        b.append("wyliczanka z kilku elementów w jednym zdaniu; zostaw najważniejszy")
    if re.search(r"(w razie pytań|jestem do dyspozycji|służę pomocą|gdyby miała? (Pani|Pan) pytania)", t):
        b.append("zdanie-oferta na końcu; usuń je")
    # Ten sam początek wiadomości u kilku klientów brzmi jak szablon.
    poczatek = re.sub(r"^dzień dobry[.,!]?\s*", "", t)[:60]
    try:
        stare = [json.loads(l) for l in DZIENNIK.read_text().splitlines()[-200:]]
    except Exception:
        stare = []
    if len(poczatek) > 30 and not ma_link and any(w["p"] == poczatek and w["do"] != psid for w in stare):
        b.append("ten sam początek wiadomości poszedł już do innego klienta; napisz do tej osoby jej słowami")
    if re.search(r"\w:\s", bez_linkow):
        b.append("dwukropek w tekście do klienta")
    if re.search(r"(wyśl\w*|wysył\w*|prześl\w*|przesył\w*)\s+(\w+\s+)?formularz", t):
        b.append("formularz nie jest wysyłany; po płatności strona od razu przenosi do formularza, na podstawie którego piszemy kompletną dokumentację")
    if re.search(r"[:;]-?[)D(P]|😊|🙂|😉|😀", tekst):
        b.append("emotka w wiadomości do klienta")
    if "—" in tekst or "–" in tekst:
        b.append("długi myślnik albo półpauza")
    for z in ZAKAZANE:
        if z in t:
            b.append(f"zakazany zwrot „{z}”")
    if ma_cene and ma_link:
        b.append("cena i link do płatności w jednej wiadomości; najpierw cena i „Zaczynamy?”, link po odpowiedzi tak")
    pierwszy_znak = re.sub(r"^\W+", "", bez_linkow.strip())[:1]
    if pierwszy_znak and pierwszy_znak.islower():
        b.append("wiadomość zaczyna się małą literą")
    if len(bez_linkow.strip()) < 12 and not ma_link and not re.search(r"\d{3}", tekst):
        b.append("jednowyrazowa odpowiedź („Ok”, „Tak”, „Poszło”); napisz pełne zdanie z następnym krokiem")
    for m in BEZ_OGONKOW.finditer(bez_linkow):
        b.append(f"„{m.group(0)}” bez polskich znaków")
        break
    if OPINIE.search(tekst):
        b.append("wymiana opinii, polubień albo obserwacji jest zakazana (CLAUDE.md, nieuczciwe praktyki rynkowe)")
    if FORMULARZ_PYTANIE.search(tekst) and "płatn" not in t:
        b.append("pytanie o formularz do osoby, która nie zapłaciła; formularz otwiera się dopiero po płatności, "
                 "zapytaj o decyzję albo o to, co ją wstrzymuje")
    if re.search(r"(muszę sprostować|poprawiam się|przepraszam, umknęło)", t) and len(tekst) > 260:
        b.append("sprostowanie ma być jednym krótkim zdaniem z poprawnym faktem, bez długiego wywodu")

    imie, nasze = rozmowa(psid)
    # Właściciel 1.11.2026: odpowiedź tylko po przeczytaniu całego wątku (list_messages),
    # nigdy na podstawie podglądu z listy rozmów.
    if WATEK and OSTATNIA_KLIENTA:
        from datetime import datetime
        ostatnia = datetime.strptime(OSTATNIA_KLIENTA, "%Y-%m-%dT%H:%M:%S%z").timestamp()
        try:
            odczyty = [json.loads(l) for l in ODCZYTY.read_text().splitlines()]
        except Exception:
            odczyty = []
        # Właściciel: zawsze cała rozmowa od pierwszej wiadomości, nie tylko końcówka.
        if not any(o["watek"] == WATEK and o["czas"] >= ostatnia and o.get("ile", 0) >= min(ILE, 100)
                   for o in odczyty):
            b.append(f"nie przeczytałeś CAŁEJ rozmowy ({ILE} wiadomości) po ostatniej wiadomości klienta; "
                     "list_messages z limitem obejmującym cały wątek, potem odpowiedź na wszystkie jego pytania")
    # Właściciel 4.11.2026: „nie sprawdzasz informacji”. Liczba, data, stan naboru i warunek
    # programu przechodzą tylko ze źródłem (fakty.json, fakt.py dodaj) albo z ust klienta.
    if fakty_lib is not None:
        braki = fakty_lib.sprawdz(tekst, psid, KLIENT_TEKSTY)
        if braki:
            b.append("FAKTY BEZ ŹRÓDŁA: " + "; ".join(braki) + ". Sprawdź w regulaminie albo w aktualnym ogłoszeniu "
                     f"i zapisz: python3 narzedzia/fakt.py dodaj --psid {psid} --tekst \"…\" --zrodlo <URL albo plik:linia>, "
                     "albo usuń ten fakt z wiadomości")
    pierwsza = nasze is not None and not [m for m in nasze if m and "Odpowiadasz na komentarz" not in m]
    nasze = nasze or []
    # Właściciel 1.11.2026: w pierwszej wiadomości nigdy o płatności i cenie,
    # nawet gdy klient pyta o koszt. Najpierw rozmowa o jego sprawie.
    # Link do bezpłatnej kwalifikacji (formularz.kapitalownia.pl/splot/) nie jest płatnością
    # i może paść w pierwszej wiadomości (właściciel 3.11.2026).
    t_bez_kwalifikacji = re.sub(r"https?://formularz\.kapitalownia\.pl/splot/?\S*", "", t)
    if pierwsza and re.search(r"płatno|stripe|\bzł\b|formularz", t_bez_kwalifikacji):
        b.append("pierwsza wiadomość do klienta mówi o płatności, kwocie albo formularzu; najpierw zapytaj o jego sprawę")
    # Graph API zwraca wiadomości od najnowszej. Pytanie o decyzję zadajemy raz,
    # a to samo otwarcie nie wraca w kolejnych wiadomościach (review 31.10.2026).
    if ZACZYNAMY.search(tekst) and any(ZACZYNAMY.search(m or "") for m in nasze[:3]):
        b.append("„Zaczynamy?” już padło w ostatnich wiadomościach; odpowiedz na pytanie i zakończ konkretnym krokiem")
    for o in OTWARCIA:
        if t.startswith(o) and any((m or "").lower().startswith(o) for m in nasze[:5]):
            b.append(f"otwarcie „{o}” już było w tej rozmowie; zacznij od treści")
    # Link dopiero po cenie i zgodzie klienta (analiza 3.11.2026: link wysłany przed ceną
    # albo zaraz po kwalifikacji kończył rozmowę).
    if ma_link and not any(CENA.search(m or "") for m in nasze):
        b.append("link do płatności przed podaniem ceny w tej rozmowie; najpierw cena, co klient dostaje i „Zaczynamy?”")
    # Ten sam link drugi raz blokujemy; inny link (zmiana usługi) jest dozwolony.
    if ma_link:
        nowe = {l.rstrip(".,)") for l in STRIPE.findall(tekst)}
        stare = {l.rstrip(".,)") for m in nasze for l in STRIPE.findall(m or "")}
        if nowe & stare:
            b.append("ten link do płatności już poszedł w tej rozmowie; odeślij do linku wyżej")
    if imie:
        pierwsze = imie.split()[0].lower()
        for m in ZWROT.finditer(tekst):
            wolacz = m.group(1).lower()
            # wołacz różni się końcówką od mianownika (Paweł → Pawle), porównujemy początek
            if wolacz[:3] != pierwsze[:3]:
                b.append(f"zwrot „{m.group(0)}”, a odbiorca to {imie}; sprawdź, czy to właściwa rozmowa")
    return b


def main():
    wejscie = json.load(sys.stdin)
    if wejscie.get("tool_name", "").split("__")[-1] != "send_message":
        return 0
    dane = wejscie.get("tool_input", {})
    tekst = dane.get("text") or ""
    if not tekst:
        return 0
    psid = str(dane.get("recipient_id", ""))
    lista = bledy(tekst, psid)
    if not lista:
        try:
            DZIENNIK.parent.mkdir(parents=True, exist_ok=True)
            p = re.sub(r"^dzień dobry[.,!]?\s*", "", tekst.lower())[:60]
            with DZIENNIK.open("a") as f:
                f.write(json.dumps({"do": psid, "p": p}, ensure_ascii=False) + "\n")
        except Exception:
            pass
    if lista:
        print("Wiadomość zatrzymana przez hook (styl.md, audyt 29.10.2026): " + "; ".join(lista) + ".",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
