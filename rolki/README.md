# Rolki Kapitałowni (Remotion)

Każda rolka to plik JSON w `scenariusze/`. Komponenty w `src/Rolka.tsx` mają kolory, fonty i logo marki, więc nowa rolka to tylko nowy scenariusz.

- Podgląd na żywo: `npm run studio`
- Render: `node render.mjs scenariusze/lista.json out/lista.mp4`

Format 1080×1920, 30 kl./s, H.264, bez dźwięku (muzykę dodajemy przy publikacji z biblioteki Meta).

Typy elementów w scenie: `etykieta`, `tytul`, `numer`, `naglowek`, `tekst` (`kolor`: cream, muted, blue, `serif`), `haslo`. Scena `"tempo": "szybkie"` ma krótsze przejścia (listy). Scena z `"koniec": true` to plansza końcowa z logo (`zdanie`, `przycisk`).

Fakty w rolkach biorą się tylko z plików skilla (`przepisy.md`, `katalog.md`, `nabory.md`). Bez cen usług.

Licencja Remotion jest bezpłatna dla firm zatrudniających do 3 osób.
