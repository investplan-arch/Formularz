# Rolki Kapitałowni

Pionowe rolki 1080×1920 (30 kl./s) składane kodem w [Remotion](https://www.remotion.dev). Treść każdej rolki jest w osobnym pliku JSON, a wygląd w szablonie `src/Rolka.jsx` (kolory marki, fonty Oswald i Geist, marginesy pod nakładki Instagrama i TikToka).

## Pierwsze uruchomienie

```bash
cd rolki
npm install
```

## Nowa rolka

1. Skopiuj `src/rolki/wsparcie-w-starcie-pracujacy.json` pod nową nazwą i zmień `id` oraz teksty.
2. Dopisz import i plik do listy w `src/rolki/index.js`.
3. Wyrenderuj.

```bash
npx remotion render <id> out/<id>.mp4
npx remotion still <id> out/<id>.png --frame=60   # pojedyncza klatka do sprawdzenia
npx remotion studio                                # podgląd na żywo w przeglądarce
```

Typy scen i pola:

| typ | pola | do czego |
|---|---|---|
| `hak` | `nad`, `przedrostek`, `kwota` (liczba), `pod`, `dopisek` | pierwsze 3 sekundy, kwota liczy się od zera |
| `lista` | `tytul`, `punkty` (2-3) | konkrety |
| `fakt` | `tytul`, `duze`, `pod`, `dopisek` (opcjonalnie) | jedna liczba albo jedno hasło |
| `uwaga` | `etykieta`, `tytul`, `tekst` | pułapka, warunek, który wyklucza |
| `cta` | `tytul`, `przycisk`, `marka` | ostatnia plansza |

Każda scena ma `sekundy`. Cała rolka to suma scen, najlepiej 20-30 s.

Teksty piszemy według `.claude/skills/kapitalownia-asystent/styl.md` (bez dwukropków i długich myślników, krótkie hasła). Liczby tylko z `przepisy.md`, `nabory.md` albo ogłoszenia instytucji. Szablon sam wstawia twarde spacje po jednoliterowych słowach i między liczbą a jednostką.

## Przeglądarka do renderu

Remotion pobiera Chrome Headless Shell. Gdy pobieranie jest zablokowane (sesje w chmurze), `remotion.config.js` używa przeglądarki z Playwrighta z `/opt/pw-browsers`. Inną ścieżkę można podać w zmiennej `REMOTION_BROWSER`.

## Głos i tło (na później)

- **Własne nagranie** jest najlepsze dla zaufania. Plik audio wrzuć do `public/` i dodaj `<Audio src={staticFile('glos.mp3')} />` w `Rolka.jsx`, a długości scen dopasuj do nagrania.
- **Lektor ElevenLabs** (płatny plan do użytku komercyjnego). Klucz tylko w zmiennej środowiskowej `ELEVENLABS_API_KEY`, nigdy w repo ani w czacie.
- **Tło wideo z Pexels** (darmowa licencja). Klucz w zmiennej `PEXELS_API_KEY`. Pobrany film do `public/` i `<OffthreadVideo>` pod tekstem z przyciemnieniem, żeby napisy zostały czytelne.

Gotowe pliki trafiają do `out/`, którego nie commitujemy.
