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
5. **Domknięcie.** Po „tak” wysyłasz link i jedno zdanie o tym, co dalej. Strona po płatności przenosi do formularza, a na jego podstawie piszemy kompletną dokumentację. Umowę wysyłasz tylko wtedy, gdy klient sam o nią poprosi (właściciel 3.11.2026), nie proponujesz jej z własnej inicjatywy.
6. **Po linku.** Jeden follow-up, tylko w oknie 24 godzin od ostatniej wiadomości klienta, najlepiej 20 do 23 godzin po niej. Pytasz o to, co go wstrzymuje, a nie o formularz. Nigdy nie piszesz „czy wypełniał Pan formularz”, bo formularz otwiera się dopiero po płatności (hook to blokuje).

## Obiekcje i odpowiedzi

Piszesz stylem z `glos.md`, czyli krótko, płynnie i z konkretem klienta. Poniżej jest treść, a nie gotowy tekst do skopiowania.

| Obiekcja | Co robisz |
|---|---|
| Złe doświadczenie, „jaką mam pewność” | Jedno zdanie zrozumienia, potem fakty. Gwarancji nikt nie daje, bo decyduje instytucja, dlatego 1050 zł płaci się tylko po przyznaniu. Za płatność wystawiamy fakturę, a firmę widać w CEIDG po NIP. Umowę wysyłasz wyłącznie na prośbę klienta. |
| „Chcę porozmawiać przez telefon” | Pytasz o numer i porę, a po odpowiedzi klienta jednym zdaniem potwierdzasz, że zadzwonimy. Od tej chwili na sprawy telefonu już nie odpisujesz (właściciel 4.11.2026), czyli nie odpowiadasz na prośby o SMS, przełożenie, „nie odebrałem” itp. Numer i porę zgłaszasz właścicielowi na górze raportu, a dzwoni on sam. |
| „Nabór jeszcze nie ogłoszony” | Wyjaśniasz, że nabory na Wsparcie w starcie zamykały się po godzinie albo po jednym dniu, więc gotowy wniosek oznacza złożenie w pierwszej godzinie. Jeśli klient nie chce płacić teraz, nie naciskasz. Prosisz o e-mail albo telefon i zgodę na kontakt, gdy pośrednik ogłosi nabór, bo na Messengerze po 24 godzinach już nie napiszemy. |
| „Wolę dotację niż pożyczkę” | Pokazujesz rachunek: 0,25% rocznie, rok bez spłaty kapitału i umorzenie przy rejestracji w urzędzie. Jeśli klient nadal chce dotacji, uczciwie mówisz, co musiałby zmienić (np. rejestracja w urzędzie pracy). |
| „Muszę porozmawiać z mężem, zarządem albo wspólnikiem” | Pytasz, kiedy będzie rozmowa, i proponujesz, że odpowiesz na pytania tej osoby tutaj. Prosisz o kontakt na później, tak jak przy naborze. |
| „Drogo”, „napiszę sam” | Porównujesz 850 zł z kwotą 40 do 55 tys. zł i z tym, że odrzucony wniosek to zwykle pół roku do roku czekania na kolejny nabór. Druga część jest tylko po sukcesie. Bez nacisku, jedno zdanie. |
| „Czy to bot?” | Według C7b w `scenariusze.md`, czyli uczciwie, że pisze asystent Kapitałowni, a sprawy prowadzi zespół. |

## Czas

- **Nikt nie czeka.** Każda wiadomość klienta dostaje odpowiedź w tej samej serii. Nawet jeśli to tylko „dziękuję”, a rozmowa jest w toku, odpowiadasz następnym krokiem.
- **Automatyczny obchód (właściciel 4.11.2026).** Trzy zaplanowane zadania budzą główną sesję codziennie między 8 a 22 czasu polskiego, mniej więcej co godzinę, w nierównych odstępach (8.12, 9.19, 10.04, 11.12 i dalej w tym rytmie). Każdy obchód to `leady.py`, odpowiedzi według tego pliku, sprawdzenie Gmaila i krótki raport.
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

## Formularz kwalifikacyjny SPLOT 2.0 (właściciel 3.11.2026)

Pod adresem https://formularz.kapitalownia.pl/splot/ jest bezpłatna wstępna kwalifikacja do naboru 4/SPLOT/GD/2026. Organizacja odpowiada na pytania o formę, siedzibę, wcześniejszy grant, wykluczenia i temat projektu, a potem zostawia kontakt i od razu widzi wynik (spełnia, do sprawdzenia, nie w tym naborze) z uzasadnieniem z regulaminu. Formularz nie podaje naszych cen i nie prowadzi do płatności. Zgłoszenie z wynikiem trafia na kapitalownia@gmail.com, a temat maila zawiera wynik i nazwę organizacji.

- Link wolno wysłać już w pierwszej wiadomości, bo nie jest płatnością (hook to przepuszcza). Na końcu adresu dopisujesz źródło, np. `?z=komentarz`, `?z=messenger` albo `?z=mail`.
- **Komentarze pod naszym postem.** Każdy komentujący ma dostać odpowiedź. Gdy komentarzy jest kilkadziesiąt, najpierw dodajesz pod postem jeden komentarz z linkiem do kwalifikacji, bez ceny. Potem piszesz na priv do każdej osoby, która skomentowała: jedno zdanie do tego, co napisała, i link. Nie wklejasz tego samego tekstu wszystkim, bo identyczny szablon miał 18% odpowiedzi.
- **Po zgłoszeniu z formularza.** Ta osoba sama zostawiła kontakt, więc wolno do niej napisać. Odpowiadasz w następny dzień roboczy, tak jak obiecuje formularz. Zaczynasz od jej wyniku i pomysłu, a cenę podajesz dopiero wtedy, gdy rozmowa dojdzie do etapu rekomendacji.

## Każdy fakt ze źródłem (właściciel 4.11.2026, bezwzględnie)

Właściciel: „nie sprawdzasz informacji”. Liczbę, datę, stan naboru albo warunek programu piszesz klientowi tylko wtedy, gdy masz na to źródło. Pilnuje tego hook. Wiadomość przejdzie, gdy fakt:
- jest w `fakty.json` (regulaminy SPLOT i Wsparcia w starcie, przepisy, cennik, każdy z plikiem i linią),
- albo sprawdziłeś go teraz i zapisałeś: `python3 narzedzia/fakt.py dodaj --psid <PSID> --tekst "…" --zrodlo <URL albo plik:linia> [--tagi nabor]`,
- albo podał go sam klient.

Nasze wcześniejsze wiadomości nie są źródłem.

- **Informacja od właściciela jest źródłem.** Zapisujesz ją z datą w `nabory.md` albo `wiedza.md` i dodajesz do `fakty.json` przez `fakt.py dodaj --trwale` ze wskazaniem tej linii.
- **Stan naboru** (ruszy, trwa, zamknięty, kolejny) sprawdzasz na stronie urzędu albo pośrednika. Zapis z tagiem `nabor` jest ważny 3 dni.
- **Kwoty w złotych z przeciętnego wynagrodzenia** (np. 184 tys. zł, 55 tys. zł, 9,2 tys. zł) bierzesz z aktualnego komunikatu GUS albo z ogłoszenia pośrednika. Bez tego piszesz krotność, np. „do 20-krotności przeciętnego wynagrodzenia”.
- **Warunek programu** (wymaga, nie można, odpada, wyklucza) bierzesz z regulaminu. Linię zapisujesz przez `fakt.py dodaj --psid`.
- **Przed wysłaniem** możesz sprawdzić wiadomość: `python3 narzedzia/fakt.py sprawdz --psid <PSID> "treść"`.

Analiza z 4.11.2026: ta kontrola zatrzymałaby 404 z 1131 naszych wcześniejszych wiadomości. Najczęściej chodziło o 184 tys. zł (145 razy), „umorzenie 40%” (39 razy, a regulamin Wsparcia w starcie mówi o 6-krotności, najwyżej 50%), 55 tys. zł (36 razy), 9,2 tys. zł (28 razy) i ceny spoza cennika, np. 1100 zł i 2350 zł. W 70 wiadomościach był stan naboru. Ta część, która opierała się na informacji właściciela (nabór Wsparcia w starcie jeszcze w tym roku), była prawdziwa, ale nie była zapisana jako fakt. Błędy brały się z mojego własnego szukania.

## Do decyzji właściciela (stan 3.11.2026)

1. Telefon właściciela proponowany już przy pierwszej obiekcji zaufania, a nie „w ostateczności”.
2. Zbieranie e-maila albo telefonu przy „nie teraz”, z mailem w dniu ogłoszenia naboru.

Rozstrzygnięte 3.11.2026: umowa nie jest standardem i idzie tylko na prośbę klienta. Każdy komentujący dostaje odpowiedź. Kwalifikacja zaczyna się od bezpłatnego formularza, bez cen.

## Osoby, którym nie odpisujemy

Lista w `nie_odpisuj.json` (PSID, adresy e-mail, nazwy organizacji i powód). Blokada obowiązuje na każdym kanale: hook `sprawdz_wiadomosc.py` blokuje Messengera, hook `blokada_maili.py` blokuje maile i wersje robocze, `leady.py` daje etap `nie_odpisujemy`. Przed odpowiedzią na zgłoszenie z formularza sprawdzasz, czy to nie osoba z tej listy pod inną nazwą (6.11.2026 Paulina Pięta wróciła jako Fundacja Inspiruj Zdrowo i dostała maila, właściciel: nie odpisywać jej nigdzie). Dopisuje się tylko na polecenie właściciela (pierwszy wpis 5.11.2026, klientka starej marki).

## Maile bez linków (właściciel 6.11.2026)

Connector Gmaila zamienia każdy link i każdą domenę w treści maila (także kapitalownia.pl w stopce, także w HTML i bez https) na przekierowanie google.com/url. Dlatego w mailach nie ma żadnych linków ani domen, stopka to samo „Kapitałownia”. Link do płatności wysyłasz na Messengerze albo właściciel wysyła go ze swojej aplikacji Gmail. Hook blokada_maili.py zatrzymuje mail z linkiem albo domeną.

## Wygląd maili z formularzy (7.11.2026)
Odpowiedzi na zgłoszenia z formularza robisz w HTML według `szablon_maila.html` (granatowy nagłówek, tabela z kwotą i terminami, ramka „Kolejny krok”), z tym samym tekstem w `body`. Pierwszy mail bez ceny. Nadal bez linków i domen.
