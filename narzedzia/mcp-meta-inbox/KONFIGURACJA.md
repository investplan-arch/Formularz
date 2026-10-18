# Messenger Kapitałowni w Claude

Serwer MCP z tego katalogu daje Claude dostęp do skrzynki i komentarzy strony Kapitałowni na Facebooku. Claude sam czyta całe rozmowy, przygotowuje odpowiedzi według skilla kapitalownia-asystent i wysyła je dopiero po Twoim poleceniu.

Kod pochodzi z https://github.com/pauloFroes/mcp-meta-inbox (licencja MIT, commit 607738f z 29.07.2026). Łączy się wyłącznie z graph.facebook.com. Kopia jest w repo, bo instalacja przez `npx github:` nie działa w sesjach w chmurze.

## Co działa

| Funkcja | Działa | Uwagi |
|---|---|---|
| Czytanie rozmów Messengera | tak | cała historia rozmowy |
| Wysyłanie wiadomości | tak | do 24 godzin od ostatniej wiadomości klienta, każde wysłanie wymaga Twojej zgody |
| Komentarze na Facebooku i Instagramie | tak | odpowiedź publiczna, odpowiedź prywatna (do 7 dni), ukrywanie |
| Usuwanie komentarzy | zablokowane | w `.claude/settings.json` |
| Wiadomości na Instagramie | nie | wymaga przeglądu aplikacji przez Meta |

## Konfiguracja, około 30 minut

1. **Strona w portfolio firmowym.** Na https://business.facebook.com wejdź w Ustawienia, potem Konta i Strony. Strona Kapitałowni musi tam być, a Ty musisz mieć do niej pełny dostęp.
2. **Aplikacja Meta.** Na https://developers.facebook.com wybierz Moje aplikacje, potem Utwórz aplikację. Jako przypadek użycia wybierz interakcję z klientami w Messengerze (Engage with customers on Messenger from Meta). Podłącz portfolio firmowe z kroku 1.
3. **Token strony.** W aplikacji otwórz Przypadki użycia, potem Messenger i Dostosuj. Wejdź w Ustawienia interfejsu API Messengera, a w sekcji generowania tokenów dostępu połącz stronę Kapitałowni i kliknij Generuj. Token pojawia się tylko raz. Nie generuj go w Użytkownikach systemowych w Business Managerze, bo taki token nie działa ze skrzynką.
4. **ID strony.** Meta Business Suite, potem strona i Informacje, albo na Facebooku strona, Informacje i Przejrzystość strony.
5. **Zapisanie w środowisku Claude.** W sesji Claude Code otwórz menu środowiska w pasku tytułu, potem Edit, i dodaj dwie zmienne środowiskowe.
   - `META_PAGE_ACCESS_TOKEN` z tokenem z kroku 3
   - `META_PAGE_ID` z numerem z kroku 4

   Tokenu nigdy nie wklejaj do czatu ani do plików w repo.
6. **Test.** Otwórz nową sesję na repozytorium Formularz i napisz „sprawdź dostęp do Messengera”. Claude uruchomi `check_access` i powie, co działa.

Później wystarczy napisać w sesji „sprawdź skrzynkę” albo „odpisz klientom z Messengera”.

## Gdy coś nie działa

- **Błąd z kodem 2 albo „unexpected error”** oznacza token użytkownika systemowego. Wygeneruj token strony według kroku 3.
- **Pusta lista rozmów albo błąd uprawnień** pojawia się, gdy strona nie należy do portfolio, które jest właścicielem aplikacji. Wtedy dodaj stronę do portfolio (krok 1). Jeśli to nie pomoże, w ustawieniach aplikacji przełącz ją w tryb Live.
- **Wysyłka odrzucona po 24 godzinach** to zasada Meta. Odpowiedź zostaje do wysłania ręcznie, gdy klient znów napisze.

## Bezpieczeństwo

Token nie wygasa. Jeśli wycieknie, usuń aplikację albo odłącz stronę w jej ustawieniach Messengera i wygeneruj nowy. Narzędzia, które wysyłają wiadomości, publikują albo ukrywają komentarze, zawsze pytają o zgodę (`.claude/settings.json`), a usuwanie komentarzy jest zablokowane.

## Claude Desktop na komputerze

Jeśli wolisz aplikację na komputerze, dopisz do `claude_desktop_config.json` (Ustawienia, Developer, Edit Config) wpis poniżej i uruchom aplikację ponownie. Potrzebny jest zainstalowany Node.js.

```json
{
  "mcpServers": {
    "meta-inbox": {
      "command": "npx",
      "args": ["-y", "github:pauloFroes/mcp-meta-inbox#607738fb70fb89f19f7adf3bd450277b4cbf8194"],
      "env": {
        "META_PAGE_ACCESS_TOKEN": "token-z-kroku-3",
        "META_PAGE_ID": "id-z-kroku-4"
      }
    }
  }
}
```
