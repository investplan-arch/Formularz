# Strona Kapitałowni

Statyczna strona dla kapitalownia.pl z formularzem obsługiwanym przez PHP na hostingu home.pl.
Nie wymaga bazy danych ani dodatkowych usług.

## Edycja treści

Treść każdej podstrony jest w osobnym pliku w katalogu `site/content/`. Można je edytować
bezpośrednio na GitHubie (ikona ołówka przy pliku).

| Plik | Strona |
| --- | --- |
| `index.md` | strona główna |
| `oferta.md` | oferta |
| `finansowanie-na-start.md` | finansowanie na start firmy |
| `rozwoj-firmy.md` | finansowanie rozwoju firmy |
| `fundacje-i-stowarzyszenia.md` | wsparcie NGO |
| `wspolpraca.md` | opis współpracy |
| `faq.md` | częste pytania (każde pytanie zaczyna się od `###`) |
| `kontakt.md` | formularz kwalifikacyjny i tekst obok niego |
| `zamow.md` | cennik i zamówienie (usługi są w `site/uslugi.json`) |
| `platnosc.md` | strona przed płatnością 850 zł (link do wysyłania klientom zamiast buy.stripe.com) |
| `zamowienie.md` | ankieta po płatności (adres powrotu ze Stripe) |
| `regulamin.md` | regulamin zamówień |
| `polityka-prywatnosci.md` | polityka prywatności |

Na górze pliku, między liniami `---`, są tytuł strony dla wyszukiwarki (`title`), opis (`description`)
i nagłówek strony (`hero`). Niżej jest zwykły tekst w formacie Markdown:
`## Nagłówek`, `**pogrubienie**`, `[tekst linku](/kontakt/)`, listy zaczynające się od `-`.

Bloki zaczynające się od `::: cards` i kończące `:::` to siatka kart. Każda karta zaczyna się od `###`,
a link w ostatniej linii karty staje się przyciskiem „więcej”.
`::: section note` to wyróżniona ramka, `::: section split` to układ dwukolumnowy,
`::: section steps` to numerowana lista kroków.

Nowa podstrona to nowy plik `.md` z polami `title`, `description` i `path` (np. `path: /nowa-strona/`).
Pozycje menu zmienia się w `site/site.json`.

## Programy, liczniki i cennik

- `site/programy.json` zawiera karty programów (kwota, dla kogo, forma, nabór, plusy i minusy) oraz źródła z datą sprawdzenia.
  Przy zmianie danych zaktualizuj też pole `sprawdzono`.
- `site/site.json` w polu `stats` zawiera liczniki na stronie głównej.
- `site/uslugi.json` zawiera usługi w cenniku. Pole `cena` to kwota brutto w zł, a `stripe` to adres Payment Link.
  Gdy któregoś brakuje, przycisk prowadzi do formularza wyceny. Identyfikatory usług muszą być takie same
  jak w `site/public/api/config.php`.

### Płatności Stripe (Payment Links)

Strona nie przechowuje kluczy Stripe. Dla każdej usługi tworzy się w panelu Stripe Payment Link
(Katalog produktów, potem Utwórz link płatności) z ustawieniami:
- cena brutto w PLN, ilość stała 1,
- zbieranie imienia i nazwiska oraz adresu e-mail, opcjonalnie numeru NIP do faktury,
- zgoda na regulamin z linkiem do https://kapitalownia.pl/regulamin/,
- po płatności przekierowanie na `https://kapitalownia.pl/zamowienie/?usluga=ID` (ID z `uslugi.json`).

Adres linku (https://buy.stripe.com/...) wpisuje się w polu `stripe` danej usługi.

## Ustawienia

- `site/site.json` zawiera adres e-mail, menu, link do Facebooka (pusty = niewidoczny) i dane firmy
  do polityki prywatności i regulaminu. Bez nazwy, adresu i NIP wersja produkcyjna się nie zbuduje.
- `site/public/api/config.php` zawiera adres, na który trafiają zgłoszenia, i adres nadawcy.
  Adres nadawcy musi być skrzynką założoną w panelu home.pl w domenie kapitalownia.pl.

## Budowa i testy lokalnie

```
npm ci
node site/build.mjs                       # wersja robocza w dist-preview/ (noindex)
node site/build.mjs --mode=production     # wersja produkcyjna w dist/
npm test
```

## Wdrożenie

Wdrożenie wykonuje GitHub Actions (`.github/workflows/wdrozenie.yml`), uruchamiane ręcznie w zakładce
Actions po każdej zmianie strony na `main`. Adres serwera (`serwer2612522.hosting-home.pl`), login
(`wdrozenie@kapitalownia.pl`) i katalog (`/`) są w pliku workflow, a hasło wyłącznie w GitHub Secrets
jako `FTP_PASSWORD`.
Przed każdym wgraniem workflow pobiera kopię plików z serwera i zapisuje ją jako artefakt na 90 dni.
Opcja „Tylko sprawdź” wykonuje samą kopię i test połączenia.

Wgrywanie nie usuwa plików, które już są na serwerze.

## Skille Claude Code w projekcie

W `.claude/skills/` są zapisane skille wspierające projektowanie i kontrolę jakości. Claude Code wczytuje je
przy starcie sesji w tym katalogu.

| Skill | Źródło | Wywołanie |
| --- | --- | --- |
| `web-design-guidelines` | vercel-labs/agent-skills | `/web-design-guidelines site/assets/css/style.css` |
| `minimalist-ui` | leonxlnx/taste-skill | `/minimalist-ui` |
| `seo-audit` | coreyhaines31/marketingskills | `/seo-audit` |
| `impeccable` | pbakaus/impeccable | `/impeccable critique strona-glowna` (także `audit`, `polish` i inne) |

`minimalist-ui` stosujemy w zakresie układu, typografii i oszczędnych komponentów. Kolory i logo pozostają
zgodne z identyfikacją Kapitałowni (granat, niebieski, krem), a zdjęć zastępczych nie używamy.

Impeccable jest zainstalowany bez hooków (bez `.claude/settings.local.json`). Przy pierwszym użyciu pobiera
swój silnik z GitHub Releases i sprawdza jego sumę SHA-256. Odtworzenie lub aktualizacja zestawu:
`sh scripts/skille.sh`. Źródła i sumy kontrolne są w `skills-lock.json`.
