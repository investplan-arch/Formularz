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

LIMIT = 320
LIMIT_Z_CENA = 420
ZAKAZANE = [
    "zwykle", "chętnie pomog", "proszę dać znać", "śmiało", "nie ma problemu",
    "jak najbardziej", "oczywiście", "świetne pytanie", "dziękuję za wiadomość",
    "przepraszam, nie ten",
]
CENA = re.compile(r"\b(1900|850|990|1290|1490|2490|3100|3900)\s?zł", re.I)
STRIPE = re.compile(r"buy\.stripe\.com/\S+|kapitalownia\.pl/platnosc", re.I)
ZWROT = re.compile(r"\bPani?e?\s+([A-ZŁŚŻŹĆŃÓ][a-ząęóśłżźćń]+)")
ZACZYNAMY = re.compile(r"zaczynamy\?", re.I)
OTWARCIA = ("w takim razie", "jasne", "to dobry")


def rozmowa(psid):
    """Imię odbiorcy i nasze dotychczasowe wiadomości do niego (Graph API)."""
    token = os.environ.get("META_PAGE_ACCESS_TOKEN")
    page = os.environ.get("META_PAGE_ID") or "1235937636280516"
    if not token:
        return None, []
    url = f"https://graph.facebook.com/v21.0/{page}/conversations?" + urllib.parse.urlencode({
        "user_id": psid,
        "fields": "participants,messages.limit(100){from,message}",
        "access_token": token,
    })
    try:
        dane = json.load(urllib.request.urlopen(url, timeout=15))["data"]
    except Exception:
        return None, []
    if not dane:
        return None, []
    watek = dane[0]
    imie = next((p["name"] for p in watek["participants"]["data"] if p["id"] == psid), None)
    nasze = [m.get("message", "") for m in watek.get("messages", {}).get("data", [])
             if m["from"]["id"] == page]
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
    if re.search(r"\w:\s", bez_linkow):
        b.append("dwukropek w tekście do klienta")
    if re.search(r"[:;]-?[)D(P]|😊|🙂|😉|😀", tekst):
        b.append("emotka w wiadomości do klienta")
    if "—" in tekst or "–" in tekst:
        b.append("długi myślnik albo półpauza")
    for z in ZAKAZANE:
        if z in t:
            b.append(f"zakazany zwrot „{z}”")
    if ma_cene and ma_link:
        b.append("cena i link do płatności w jednej wiadomości; najpierw cena i „Zaczynamy?”, link po odpowiedzi tak")

    potrzebna = ma_link or ZWROT.search(tekst) or ZACZYNAMY.search(tekst) or t.startswith(OTWARCIA)
    imie, nasze = rozmowa(psid) if potrzebna else (None, [])
    # Graph API zwraca wiadomości od najnowszej. Pytanie o decyzję zadajemy raz,
    # a to samo otwarcie nie wraca w kolejnych wiadomościach (review 31.10.2026).
    if ZACZYNAMY.search(tekst) and any(ZACZYNAMY.search(m or "") for m in nasze[:3]):
        b.append("„Zaczynamy?” już padło w ostatnich wiadomościach; odpowiedz na pytanie i zakończ konkretnym krokiem")
    for o in OTWARCIA:
        if t.startswith(o) and any((m or "").lower().startswith(o) for m in nasze[:5]):
            b.append(f"otwarcie „{o}” już było w tej rozmowie; zacznij od treści")
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
    lista = bledy(tekst, str(dane.get("recipient_id", "")))
    if lista:
        print("Wiadomość zatrzymana przez hook (styl.md, audyt 29.10.2026): " + "; ".join(lista) + ".",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
