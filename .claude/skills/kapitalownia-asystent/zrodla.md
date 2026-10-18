# Gdzie i jak sprawdzać nabory

Research robisz przed odpowiedzią. Zaczynasz od źródła urzędowego (ogłoszenie, regulamin, harmonogram), a portale i artykuły doradców traktujesz tylko jako drogę do niego. Przy każdym ustaleniu zapamiętujesz adres i datę, żeby podać je przy researchu dla właściciela.

## Spis treści
- Wynik researchu, czyli cztery stany naboru
- Urząd pracy (Fundusz Pracy i EFS+)
- Lokalna Grupa Działania
- PFRON
- Wsparcie w starcie (BGK)
- Fundusze Europejskie
- PARP i programy krajowe
- ARiMR
- Ekonomia społeczna (OWES, BGK)
- Organizacje pozarządowe
- Firma klienta w rejestrach
- Kwoty zależne od wynagrodzeń
- Gdy strona się nie otwiera

## Wynik researchu, czyli cztery stany naboru

Każdy sprawdzony nabór opisujesz jednym ze stanów.
1. Otwarty do dnia X (albo do wyczerpania środków).
2. Zapowiedziany na termin Y (harmonogram, komunikat).
3. Zamknięty albo środki wyczerpane na ten rok.
4. Brak informacji na stronach instytucji.

Klient słyszy tylko stany 1–3. Stan 4 trafia do notatki „Dla Ciebie” z adresem.

## Urząd pracy (Fundusz Pracy i EFS+)

**Najszybciej przez skrypt.** Portal Zielona Linia publikuje ogłoszenia urzędów pracy z całej Polski, a skrypt `skrypty/nabory_pup.py` pobiera je przez publiczne API. Uruchamiasz go, gdy masz dostęp do wykonywania kodu.

```bash
python3 skrypty/nabory_pup.py --urzad "Legnica"          # dotacje na start w jednym urzędzie
python3 skrypty/nabory_pup.py --temat pfron --dni 60     # nabory PFRON w całej Polsce
python3 skrypty/nabory_pup.py --temat kfs                # KFS
python3 skrypty/nabory_pup.py --temat pracodawca         # refundacje, vouchery, prace interwencyjne
python3 skrypty/nabory_pup.py --temat wszystko --dni 14  # wszystko z ostatnich 2 tygodni
```

Skrypt pokazuje tytuł, datę publikacji, terminy i kwoty znalezione w treści oraz link. Nie każdy urząd publikuje na portalu, więc brak wyniku nie znaczy, że naboru nie ma. Warunki zawsze potwierdzasz na stronie urzędu.

Adres strony urzędu zwykle wygląda tak https://NAZWA.praca.gov.pl, gdzie NAZWA to miasto siedziby urzędu małymi literami bez polskich znaków (np. https://krapkowice.praca.gov.pl). Gdy nie działa, szukasz „powiatowy urząd pracy [miasto] praca.gov.pl”.

Na stronie urzędu przeglądasz aktualności i ogłoszenia z ostatnich miesięcy. Szukasz dwóch rodzajów naborów, bo to osobne pule pieniędzy.
- **Fundusz Pracy** hasła „dofinansowanie podjęcia działalności”, „jednorazowe środki”, „nabór wniosków”.
- **EFS+** hasła „EFS+”, „FE”, „projekt”, „Fundusze Europejskie dla…”, „aktywizacja osób”. Te nabory często trwają do wyczerpania środków albo do końca roku i mają grupy docelowe (np. wiek, długotrwałe bezrobocie).

Z ogłoszenia zapisujesz termin, maksymalną kwotę, grupę docelową, formy zabezpieczenia i link do regulaminu.

Zapasowo sprawdzasz https://zielonalinia.gov.pl (zapytanie „zielonalinia.gov.pl PUP [miasto] nabór”), BIP urzędu lub starostwa i profil urzędu na Facebooku.

## Lokalna Grupa Działania

1. Ustal gminę (z miejscowości) i powiat.
2. Znajdź LGD tej gminy. Zapytania „LGD gmina [nazwa]”, „lokalna grupa działania [nazwa gminy] LSR 2023-2027”. Strona gminy często linkuje swoją LGD. Listy LGD publikują urzędy marszałkowskie, np. https://mazovia.pl/pl/wsparcie-unijne/wspolna-polityka-rolna-2023-2027/lokalne-grupy-dzialania.html i https://dprow.umww.pl/obszary-wiejskie/lokalne-grupy-dzialania/
3. Na stronie LGD otwierasz **harmonogram naborów** (zakładki „Harmonogram naborów”, „Nabory”, „Ogłoszenia o naborach”, „Konkursy”). Samo potwierdzenie, że gmina należy do LGD, nie wystarcza.
4. Zapisujesz nazwę LGD, termin najbliższego naboru na podejmowanie działalności i na rozwój, kwotę premii, wymóg zameldowania i wkładu własnego, jeśli są w ogłoszeniu.
5. Nabory LGD bywają też ogłaszane na stronie urzędu marszałkowskiego województwa (sekcja PS WPR, LEADER, RLKS).

## PFRON

Środki z art. 12a na działalność przyznaje PUP, więc szukasz ich na stronie urzędu pracy (hasła „PFRON”, „art. 12a”, „osoby niepełnosprawne”). Programy PFRON dla pracodawców i osób są na https://www.pfron.org.pl, a dofinansowanie wynagrodzeń obsługuje system SODiR.

## Wsparcie w starcie (BGK)

Warunki ustawowe są w przepisy.md. Pośrednika w województwie klienta szukasz na stronie BGK https://www.bgk.pl/male-i-srednie-przedsiebiorstwa/inwestycje/finansowanie-ze-srodkow-krajowych/pozyczki-z-programu-pierwszy-biznes-wsparcie-w-starcie/ albo zapytaniem „Wsparcie w starcie pośrednik [województwo]”. U pośrednika sprawdzasz, czy pożyczka jest współfinansowana z UE (od tego zależy umorzenie) i czy przyjmuje wnioski.

## Fundusze Europejskie

- Oficjalna wyszukiwarka dotacji https://www.funduszeeuropejskie.gov.pl/wyszukiwarka/ z filtrami typu wnioskodawcy, lokalizacji i rodzaju wsparcia (dotacje albo pożyczki i gwarancje). Pokazuje ogłoszone nabory.
- Harmonogram naborów programu regionalnego danego województwa (strona FE województwa, np. funduszeue.slaskie.pl, funduszeue.lubelskie.pl, funduszeue.opolskie.pl).
- Pożyczki dla firm prowadzą regionalne fundusze pożyczkowe i pośrednicy BGK. Szukasz „pożyczka unijna [województwo] fundusz pożyczkowy”.
- Bezpłatne Punkty Informacyjne Funduszy Europejskich w każdym województwie.

## PARP i programy krajowe

- https://www.parp.gov.pl (aktualne nabory i harmonogram) oraz harmonogram FENG na stronie programu Fundusze Europejskie dla Nowoczesnej Gospodarki.
- Programy dla startupów idą zwykle przez akceleratory i inkubatory (np. Startup Booster, Platformy startowe).

## ARiMR

Harmonogram naborów w ramach Planu Strategicznego WPR jest na https://www.gov.pl/arimr (plik harmonogramu z orientacyjnymi terminami). Wnioski składa się przez Platformę Usług Elektronicznych ARiMR. Kredyty z dopłatą i gwarancją dla rolników prowadzą banki współpracujące z BGK.

## Ekonomia społeczna (OWES, BGK)

- OWES w województwie klienta. Zapytanie „OWES [województwo] dotacje miejsca pracy nabór”.
- Pożyczki dla podmiotów ekonomii społecznej na stronie BGK i u pośredników. Zapytanie „BGK pożyczka podmioty ekonomii społecznej [rok]”.

## Organizacje pozarządowe

- NIW-CRSO https://niw.gov.pl (NOWEFIO, PROO, Korpus Solidarności, Fundusz Młodzieżowy).
- Otwarte konkursy ofert w BIP gminy, powiatu i województwa.
- Serwis ngo.pl, sekcja konkursów i dotacji, jako przegląd. Warunki zawsze z ogłoszenia.
- LGD (granty dla organizacji) i wyszukiwarka FE z filtrem organizacji.

## Firma klienta w rejestrach

Gdy klient ma albo miał firmę, daty decydują o kwalifikacji (12 miesięcy bez działalności przed PUP, rok przed premią LGD, staż przy pożyczkach dla firm).

```bash
python3 skrypty/firma.py 7393982505        # NIP, biała lista VAT, CEIDG i KRS
python3 skrypty/firma.py --krs 0000123456  # spółka, fundacja, stowarzyszenie
```

- Biała lista VAT działa bez klucza, ale firm zwolnionych z VAT często w niej nie ma.
- KRS działa bez klucza dla spółek, fundacji, stowarzyszeń i spółdzielni.
- CEIDG (jednoosobowe firmy, daty zawieszenia i zakończenia) wymaga bezpłatnego tokenu z dane.biznes.gov.pl w zmiennej `CEIDG_TOKEN`. Bez tokenu sprawdzasz firmę w wyszukiwarce na https://www.biznes.gov.pl/pl/wyszukiwarka-firm/.

Klientowi nie przepisujesz danych z rejestru. Wynik służy tylko do oceny, która ścieżka jest dla niego otwarta.

## Kwoty zależne od wynagrodzeń

Limity „do 6-krotności”, „do 20-krotności” liczysz od przeciętnego wynagrodzenia ogłaszanego przez GUS, obowiązującego w dniu zawarcia umowy. Limity zależne od minimalnego wynagrodzenia liczysz od kwoty obowiązującej w danym roku. Gdy podajesz złotówki, bierzesz je z ogłoszenia urzędu albo przeliczasz z aktualnego komunikatu GUS i mówisz, że to orientacyjnie.

## Gdy strona się nie otwiera

Próbujesz po kolei.
1. Adres z „www” i bez, z https i http.
2. Wyszukiwarka z nazwą instytucji i słowem „nabór”, „harmonogram”, „ogłoszenie”.
3. BIP instytucji, zielonalinia.gov.pl, strona gminy lub urzędu marszałkowskiego.
4. Profil instytucji na Facebooku.
5. Przeglądarka (np. Claude in Chrome), jeśli jest dostępna w rozmowie.

Jeśli nic nie działa, nie zatrzymujesz sprzedaży. Klient dostaje to, co pewne, i następny krok, a właściciel jedną krótką notatkę z adresem do sprawdzenia.
