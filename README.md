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
| `kontakt.md` | tekst obok formularza |
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

## Ustawienia

- `site/site.json` zawiera adres e-mail, menu, link do Facebooka (pusty = niewidoczny) i dane administratora
  danych do polityki prywatności. Bez danych administratora wersja produkcyjna się nie zbuduje.
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
Actions. Dane FTP są przechowywane wyłącznie w GitHub Secrets: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_DIR`.
Przed każdym wgraniem workflow pobiera kopię plików z serwera i zapisuje ją jako artefakt na 90 dni.
Opcja „Tylko sprawdź” wykonuje samą kopię i test połączenia.

Wgrywanie nie usuwa plików, które już są na serwerze.
