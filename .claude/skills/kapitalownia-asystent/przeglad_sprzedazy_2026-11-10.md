# Przegląd procesu sprzedaży, 10.11.2026

Dane: 475 rozmów na Messengerze z 45 dni (`python3 narzedzia/lejek_stat.py --dni 45`), Stripe od 25.09, Gmail (formularze i wersje robocze), `sprawy.md`.

## Liczby
- Messenger: 475 rozmów, klient odpisał w 233, cenę dostało 100, link do płatności 54.
- Wpłaty w tym czasie: Fundacja Scena Współczesna 2250 + 1500 zł, Łukasz Warna-Wiesławski 690 zł, Agnieszka Czinar 650 zł (przelew), Anna Sokołowska 850 zł (przelew), Fundacja Lepsze Jutro 850 zł. Razem ok. 6800 zł.
- Wszyscy płacący to organizacje. Większość przyszła przez formularz i mail albo zapłaciła przelewem.
- Wsparcie w starcie: 82 rozmowy, 49 cen, 34 linki, 0 wpłat.
- Stripe: 135 otwarć strony płatności, 4 zakończone. Część otwarć to podglądy linków, ale Iwona Szlaga wpisała e-mail dwa razy (4.11 i 9.11) i nie dokończyła, a Fundacja Scena Współczesna potrzebowała 6 prób.
- Szybkość: odpowiedź do 6 h daje dojście do ceny w ok. 50% rozmów, po 6 h w ok. 20%. 15 osób napisało pierwsze i nie dostało żadnej odpowiedzi (12 z nich 5.10 rano, „start fundacji”).
- Wiadomości po komentarzu: 292 wysłane, 50 odpowiedzi (17%).
- Po cenie milknie 29 ze 100 osób, po linku 21 z 54. Follow-up po linku dostało 7 osób.

## Luki
1. Płatność. Link Stripe nie pasuje do organizacji, które płacą z konta fundacji na podstawie proformy. Klienci sami proszą o przelew (Alicja Pietroń 26.10, Agnieszka Czinar, Borys Pardus, Karol Zużewicz). Przelew domyka w 1 dzień.
2. Wersje robocze czekają na „wyślij”. Alicja Pietroń poprosiła 26.10 o dane do przelewu, wersja robocza leży do dziś. Tak samo fundacjadawida (2.11), Daniel Niewiadomski (29.10), Mentis (9.11), formularz dla Agnieszki Czinar po wpłacie.
3. Brak follow-upu mailowego. Po pierwszym mailu z pytaniami milczy 6 organizacji z formularza (Stal Poniatowa, Aktywni Bez Barier, Polskie Realia Ludowe, SPR Oleśnica, Przy Okazji, UTW). Mail nie ma okna 24 h, a nikt do nich nie wrócił.
4. Okno 24 h na Messengerze. Po ciszy nie mamy jak wrócić, bo nie zbieramy e-maila ani telefonu przed ceną.
5. Telefony. 23 osoby chciały rozmowy, 6 dostało obietnicę telefonu, większość rozmów się nie odbyła. Numery czekają (lista w `lejek_stat.py`).
6. Wsparcie w starcie sprzedajemy z przedpłatą 850 zł przy zawieszonych naborach. Klient pyta „a są teraz nabory?” i znika.
7. Po wysłaniu umowy nikt nie wraca (Grzegorz Domagalski, Artur Medrzycki).
8. Dwie sesje i właściciel piszą na Messengerze równolegle (gałąź `claude/sprawy-2026-11-10`), a `sprawy.md` rozjeżdża się między gałęziami. Ta sesja stała 24 h (9 do 10.11) i obchody nie szły.
9. Skarga Emilii Musiał z 26.10 (posty) bez odpowiedzi. Wymaga właściciela.

## Co wdrożone 10.11
- `narzedzia/lejek_stat.py`: statystyki lejka i lista zostawionych kontaktów.
- `lejek.md`, sekcja „Po przeglądzie 10.11.2026”.
- Wersje robocze follow-upów do organizacji z formularza.

## Decyzje właściciela (od nich zależy reszta)
1. Proforma i przelew jako standard dla organizacji (dziś wyjątek).
2. Zgoda na samodzielne wysyłanie przez główną sesję pierwszych odpowiedzi i follow-upów do osób, które wypełniły formularz.
3. Stałe okno na telefony (np. codziennie 12.00 do 13.00) albo rezygnacja z telefonów.
4. Wsparcie w starcie: lista powiadomień o naborze zamiast przedpłaty tam, gdzie naboru nie ma; sprzedaż tylko w regionach z ogłoszonym naborem.
5. Uprawnienie Human Agent w aplikacji Meta (okno 7 dni zamiast 24 h).
6. Follow-up po cenie (dziś dozwolony tylko po linku i formularzu).
7. Jedna główna sesja i jedna gałąź ze `sprawy.md`.
