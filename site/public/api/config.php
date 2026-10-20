<?php
// Ustawienia formularza. Plik nie zawiera haseł.
// "from" musi być istniejącą skrzynką w domenie kapitalownia.pl założoną w panelu home.pl,
// inaczej serwer pocztowy może odrzucić wiadomość albo trafi ona do spamu.
return [
    'to' => 'kapitalownia@gmail.com',
    'from' => 'kontakt@kapitalownia.pl',
    'limit_per_hour' => (int)(getenv('KAP_FORM_LIMIT') ?: 5),
    'rate_dir' => getenv('KAP_RATE_DIR') ?: sys_get_temp_dir() . '/kapitalownia-rate',
    'salt' => 'kapitalownia-formularz',
    // Identyfikatory zgodne z site/uslugi.json
    'uslugi' => [
        'pup' => 'Wniosek o środki z urzędu pracy',
        'pfron' => 'Wniosek o środki PFRON na działalność',
        'wws' => 'Dokumenty do pożyczki Wsparcie w starcie',
        'lgd' => 'Wniosek do Lokalnej Grupy Działania',
        'biznesplan' => 'Biznesplan',
        'ngo' => 'Wniosek grantowy dla organizacji',
        'fundacja' => 'Założenie fundacji',
        'fundacja-grant' => 'Fundacja z pierwszym wnioskiem grantowym',
        'sprawdzenie' => 'Sprawdzenie Twojego wniosku',
        'konsultacja' => 'Konsultacja 30 minut',
    ],
];
