# Maile do klientów

Ustalenie właściciela z 23.10.2026. Każdy mail z ofertą albo wyjaśnieniem programu wysyłasz w tym formacie. Krótkie odpowiedzi na jedno pytanie mogą zostać zwykłym tekstem.

## Zasady

- Bez imienia klienta w powitaniu i bez imienia i nazwiska właściciela w podpisie. Powitanie „Dzień dobry,”, podpis „Pozdrawiam / Kapitałownia / kontakt@kapitalownia.pl · kapitalownia.pl”.
- Wysyłasz zawsze dwie wersje naraz, `htmlBody` i `body` (zwykły tekst z tymi samymi nagłówkami wielkimi literami).
- Sekcje w tej kolejności, pomijasz te, które nie pasują: DLA KOGO? (ciemna ramka z wyróżnionym zdaniem „Pana/Pani sytuacja spełnia te warunki” albo neutralnie „Ta sytuacja spełnia warunki”), WARUNKI (tabela parametr i wartość), KTO CO ROBI, KOSZT (osobna jasna ramka), NASTĘPNY KROK.
- Link do płatności musi być widoczny jako zwykły podkreślony link z pełnym adresem, a nie tylko przycisk. Gmail w trybie ciemnym usuwa tło przycisku i napis znika. Przycisk wolno dodać tylko z obramowaniem i kolorem tekstu, który działa na jasnym i ciemnym tle.
- Styl treści jak w styl.md, bez dwukropków w zdaniach i bez myślników jako wtrąceń. Etykiety w tabelach i nagłówki sekcji to nie zdania.

## Szablon HTML

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1d2622;max-width:620px">
<p>Dzień dobry,</p>
<p>[jedno, dwa zdania odpowiedzi na pytanie klienta]</p>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:18px 0"><tr><td style="background:#123a2e;color:#f7ead2;padding:16px 20px;border-radius:10px">
<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#e0b86a;margin-bottom:6px">DLA KOGO?</div>
<div>[kto może skorzystać]</div>
<div style="margin-top:10px;padding-top:10px;border-top:1px solid #2f5a4c"><b style="color:#e0b86a">[Pana/Pani] sytuacja spełnia te warunki:</b> [fakty klienta]</div>
</td></tr></table>

<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#123a2e;border-bottom:2px solid #b98a3e;padding-bottom:4px;margin-top:22px">WARUNKI</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:8px">
<tr><td style="padding:6px 0;color:#5d625f;width:45%">[parametr]</td><td style="padding:6px 0"><b>[wartość]</b></td></tr>
</table>

<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#123a2e;border-bottom:2px solid #b98a3e;padding-bottom:4px;margin-top:22px">KTO CO ROBI</div>
<p><b>My</b> [...]</p><p><b>[Pan/Pani]</b> [...]</p>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:22px 0"><tr><td style="background:#f6efe4;border:1px solid #e6d6bd;padding:16px 20px;border-radius:10px">
<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#123a2e;margin-bottom:8px">KOSZT</div>
<div style="font-size:22px;font-weight:bold;color:#123a2e">[kwota] <span style="font-size:15px;font-weight:normal;color:#5d625f">[podział]</span></div>
</td></tr></table>

<div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#123a2e;border-bottom:2px solid #b98a3e;padding-bottom:4px">NASTĘPNY KROK</div>
<p>[co klient robi teraz]</p>
<p style="margin:16px 0">Link do płatności<br><a href="[URL]" style="color:#1a6b52;font-weight:bold;text-decoration:underline;word-break:break-all">[URL]</a></p>

<p style="margin-top:24px">Pozdrawiam<br><b>Kapitałownia</b><br><a href="mailto:kontakt@kapitalownia.pl" style="color:#1a6b52">kontakt@kapitalownia.pl</a> · <a href="https://kapitalownia.pl" style="color:#1a6b52">kapitalownia.pl</a></p>
</div>
```
