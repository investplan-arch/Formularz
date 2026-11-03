# Lejek sprzedaży na Messengerze (analiza 3.11.2026)

Ten plik powstał z analizy 471 rozmów z 45 dni (2653 wiadomości, w tym 1131 naszych). Etapy pochodzą z agentów sprzedażowych open source, ale są dopasowane do naszej ścieżki. SalesGPT zmienia zachowanie zależnie od etapu rozmowy. AgentSDR prowadzi kartę leada, oznacza odpowiedzi, planuje follow-upy i wymaga zatwierdzenia przez człowieka. Czytasz ten plik przed każdą serią odpowiedzi, razem z `glos.md` i sekcją „Sprzedaż na Messengerze” w `messenger.md`.

## Liczby, od których zaczynamy

| Etap | Liczba | Przejście |
|---|---|---|
| Rozmowy | 471 | |
| Klient odpisał chociaż raz | 235 | 50% (do komentujących tylko 18%) |
| Dostał cenę | 87 | 37% odpisujących |
| Dostał link do płatności | 52 | 60% tych z ceną |
| Napisał, że zapłacił | 1 | 2% tych z linkiem |

Cena nie jest problemem. Konkurencja bierze za wniosek do Wsparcia w starcie 1800 zł brutto, z czego 1100 zł przy naborze albo odbiorze dokumentów, niezależnie od wyniku (oferta na tally.so, 2026). U nas 1050 zł płaci się tylko po sukcesie. Problemem są zaufanie, czas i sposób prowadzenia rozmowy.

## Pięć przecieków (dowody z rozmów)

1. **Cisza.** W 58 rozmowach ostatnia wiadomość jest od klienta i nikt nie odpisał przez ponad 24 godziny. Wśród nich jest adres e-mail podany do kontaktu, numer telefonu do oddzwonienia, „ok, wypełnię i napiszę” i „jeśli jeszcze aktualne, proszę dać znać”. Po 24 godzinach Meta blokuje zwykłą wiadomość strony, więc taki lead przepada na zawsze. Badanie Lead Response Management (InsideSales, 2007) pokazuje, że szansa na zakwalifikowanie leada w pierwszych 5 minutach jest około 21 razy większa niż po 30 minutach.
2. **Brak zaufania przy płatności z góry.** Najczęstsze obiekcje to decyzja z kimś (41), zaufanie (25) i prośba o telefon (23). Klienci piszą wprost, że już raz zapłacili innej firmie i stracili kontakt, że chcą porozmawiać przez telefon „a nie od razu płacić”, że chcą umowy albo kogoś na miejscu. Jedyny lead, który po takiej obiekcji poszedł dalej, dostał umowę.
3. **Link za wcześnie, bez wartości.** Link padał w osobnej, suchej wiadomości „Płatność 850 zł tutaj…”, czasem przed ceną albo zaraz po jednym pytaniu kwalifikującym. Potem szło „czy wypełniał Pan formularz?”, choć formularz otwiera się dopiero po płatności. 20 z 52 osób po linku nie odpisało już ani słowa.
4. **Wykład zamiast rozmowy.** Mediana naszej wiadomości miała 295 znaków. 62 rozmowy urwały się po naszej informacji bez pytania, 51 po pytaniu kwalifikującym. Kwalifikacja ciągnęła się po 20 do 40 wiadomości. Było też co najmniej 8 sprostowań („muszę sprostować”, „poprawiam się”, „umknęło mi to”), a każde z nich obniża autorytet.
5. **Niechlujna forma.** 233 wiadomości były kopiami 6 szablonów. W naszych wiadomościach było 59 emotek, 77 dwukropków, 46 podwójnych spacji, zdania zaczynane małą literą i słowa bez polskich znaków („Poszlo”, „ktory”). Zdarzały się też odpowiedzi „Ok”, „Tak :)”, „Pan*” i „Hahaha :D” do osoby, która nas krytykowała. Wcześniejsze sesje podawały ceny spoza `wiedza.md` (1100 zł, 2350 zł, „zwracamy połowę”) i link do formularza z dopiskiem `utm_source=chatgpt.com`.

## Etapy i cel każdego

Na każdym etapie masz jeden cel i limit naszych wiadomości. Gdy limit się kończy, przechodzisz dalej z tym, co wiesz.

1. **Powitanie (1 wiadomość).** Reagujesz na to, co klient napisał, i zadajesz jedno pytanie, które najbardziej zawęża ścieżkę. Bez kwot i bez płatności (hook to pilnuje).
2. **Kwalifikacja (najwyżej 2 nasze wiadomości).** Potrzebujesz trzech rzeczy: status (bezrobotny, etat, działająca firma, organizacja), miejsce (powiat albo gmina) i cel z kwotą. Pytasz, nie wykładasz warunków programu. Jeśli klient sam podał dwie z trzech, od razu przechodzisz do rekomendacji.
3. **Rekomendacja z ceną (1 wiadomość).** Jedna droga i jedno zdanie, dlaczego właśnie ta. Do tego kwota, którą realnie można dostać, i zdanie z ceną z `CLAUDE.md` albo `glos.md` z informacją, że po stronie klienta jest tylko formularz. Kończysz „Zaczynamy?”.
4. **Obiekcje.** Według tabeli niżej, jedna obiekcja na wiadomość.
5. **Domknięcie.** Po „tak” wysyłasz link i jedno zdanie o tym, co dalej. Strona po płatności przenosi do formularza, a na jego podstawie piszemy kompletną dokumentację. Jeśli klient wahał się w sprawie zaufania, przed linkiem pytasz, czy wysłać umowę na e-mail.
6. **Po linku.** Jeden follow-up, tylko w oknie 24 godzin od ostatniej wiadomości klienta, najlepiej 20 do 23 godzin po niej. Pytasz o to, co go wstrzymuje, a nie o formularz. Nigdy nie piszesz „czy wypełniał Pan formularz”, bo formularz otwiera się dopiero po płatności (hook to blokuje).

## Obiekcje i odpowiedzi

Piszesz stylem z `glos.md`, czyli krótko, płynnie i z konkretem klienta. Poniżej jest treść, a nie gotowy tekst do skopiowania.

| Obiekcja | Co robisz |
|---|---|
| Złe doświadczenie, „jaką mam pewność” | Jedno zdanie zrozumienia, potem fakty. Gwarancji nikt nie daje, bo decyduje instytucja, dlatego 1050 zł płaci się tylko po przyznaniu. Za płatność wystawiamy fakturę, firmę widać w CEIDG po NIP, a umowę wysyłamy przed płatnością. Proponujesz umowę na e-mail. |
| „Chcę porozmawiać przez telefon” | Umawiasz konkretną godzinę w ciągu 24 godzin i od razu zgłaszasz ją właścicielowi na górze raportu. Obiecanego telefonu nie wolno przegapić. |
| „Nabór jeszcze nie ogłoszony” | Wyjaśniasz, że nabory na Wsparcie w starcie zamykały się po godzinie albo po jednym dniu, więc gotowy wniosek oznacza złożenie w pierwszej godzinie. Jeśli klient nie chce płacić teraz, nie naciskasz. Prosisz o e-mail albo telefon i zgodę na kontakt, gdy pośrednik ogłosi nabór, bo na Messengerze po 24 godzinach już nie napiszemy. |
| „Wolę dotację niż pożyczkę” | Pokazujesz rachunek: 0,25% rocznie, rok bez spłaty kapitału i umorzenie przy rejestracji w urzędzie. Jeśli klient nadal chce dotacji, uczciwie mówisz, co musiałby zmienić (np. rejestracja w urzędzie pracy). |
| „Muszę porozmawiać z mężem, zarządem albo wspólnikiem” | Pytasz, kiedy będzie rozmowa, i proponujesz, że odpowiesz na pytania tej osoby tutaj. Prosisz o kontakt na później, tak jak przy naborze. |
| „Drogo”, „napiszę sam” | Porównujesz 850 zł z kwotą 40 do 55 tys. zł i z tym, że odrzucony wniosek to zwykle pół roku do roku czekania na kolejny nabór. Druga część jest tylko po sukcesie. Bez nacisku, jedno zdanie. |
| „Czy to bot?” | Według C7b w `scenariusze.md`, czyli uczciwie, że pisze asystent Kapitałowni, a sprawy prowadzi zespół. |

## Czas

- **Nikt nie czeka.** Każda wiadomość klienta dostaje odpowiedź w tej samej serii. Nawet jeśli to tylko „dziękuję”, a rozmowa jest w toku, odpowiadasz następnym krokiem.
- **Okno 24 godzin.** Po ostatniej wiadomości klienta mamy 24 godziny na zwykłą wiadomość. Follow-up po linku wysyłasz w tym oknie, a nie „za kilka dni”.
- **Kontakt na później.** Gdy klient mówi „nie teraz”, zanim okno się zamknie, prosisz o e-mail albo telefon, za jego zgodą. Mail wysyłasz potem jako wersję roboczą w Gmailu, a wysyła go właściciel.

## Forma (pilnuje hook `narzedzia/hooks/sprawdz_wiadomosc.py`)

Wiadomość zaczynasz wielką literą i piszesz pełnymi zdaniami, z polskimi znakami. Nie wysyłasz jednowyrazowych odpowiedzi, emotek, dwukropków ani szablonów. Linku nie wysyłasz przed ceną. Sprostowanie to jedno krótkie zdanie z poprawnym faktem. Żeby sprostowań było mniej, fakt sprawdzasz przed wysłaniem.

## Tablica leadów

Na początku każdej serii uruchamiasz `python3 narzedzia/leady.py`. Skrypt pobiera rozmowy, ustala etap leada (zimny, do odpisania, kwalifikacja, cena, link, zgłoszona płatność, zamknięty, spam), rozpoznaje obiekcje i podaje następny krok. Pełna tablica z imionami zostaje lokalnie w `~/.cache/kapitalownia/leady.json`. W raporcie dla właściciela podajesz z niej cztery listy:
- do odpisania teraz,
- follow-up przed zamknięciem okna,
- zgłoszone płatności do sprawdzenia w Stripe,
- osoby, które utknęły na zaufaniu albo czekają na telefon.

## Zakazy potwierdzone w analizie

Do strony co kilka dni piszą osoby z propozycją wymiany albo zakupu opinii (7 rozmów, w dwóch padła odpowiedź). Nie odpowiadasz na nie i nie wymieniasz się opiniami ani obserwacjami. Zakazuje tego `CLAUDE.md`, a fałszywe opinie są nieuczciwą praktyką rynkową w świetle ustawy o przeciwdziałaniu nieuczciwym praktykom rynkowym.

## Do decyzji właściciela (stan 3.11.2026)

1. Telefon właściciela proponowany już przy pierwszej obiekcji zaufania, a nie „w ostateczności”.
2. Umowa jako standard przed płatnością dla każdego, kto się waha (wzór dla fundacji jest gotowy, dla startu firmy do przygotowania).
3. Test kolejności „najpierw formularz, potem płatność” w części rozmów, z bezpłatną wstępną oceną, czy wniosek ma szansę.
4. Zbieranie e-maila albo telefonu przy „nie teraz”, z mailem w dniu ogłoszenia naboru.
5. Koniec szablonów na priv do komentujących (18% odpowiedzi). Zamiast nich odpowiedź pod komentarzem i jedna wiadomość dopasowana do tego, co dana osoba napisała.
