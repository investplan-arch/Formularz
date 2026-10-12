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
];
