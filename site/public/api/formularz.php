<?php
// Odbiór formularza wstępnej oceny i wysyłka na skrzynkę Kapitałowni.
// Zgłoszenia nie są zapisywane na serwerze.
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, int $code, array $extra = []): never {
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok] + $extra, JSON_UNESCAPED_UNICODE);
    } elseif ($ok) {
        header('Location: /dziekujemy/', true, 303);
    } else {
        // Wysyłka bez JavaScriptu: prosta strona z opisem problemu
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex');
        $items = '';
        foreach (($extra['errors'] ?? []) as $msg) $items .= '<li>' . htmlspecialchars($msg) . '</li>';
        $msg = htmlspecialchars($extra['message'] ?? 'Nie udało się wysłać zgłoszenia.');
        echo '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nie wysłano zgłoszenia | Kapitałownia</title>'
           . '<style>body{font:17px/1.6 system-ui,sans-serif;background:#f7f5f0;color:#14213a;max-width:640px;margin:60px auto;padding:0 16px}a{color:#1f5a4a}</style></head><body>'
           . '<h1>Nie wysłano zgłoszenia</h1><p>' . $msg . '</p>' . ($items ? '<ul>' . $items . '</ul>' : '')
           . '<p>Wróć do formularza przyciskiem Wstecz w przeglądarce, popraw dane i wyślij ponownie. Możesz też napisać na <a href="mailto:kapitalownia@gmail.com">kapitalownia@gmail.com</a>.</p></body></html>';
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Dozwolona jest tylko metoda POST.';
    exit;
}

// Proste zabezpieczenia przed spamem
if (trim((string)($_POST['www'] ?? '')) !== '') {
    respond(true, 200); // bot dostaje pozorny sukces
}
$t = (int)($_POST['t'] ?? 0);
if ($t > 0 && (microtime(true) * 1000 - $t) < 3000) {
    respond(false, 429, ['message' => 'Formularz wysłano zbyt szybko. Spróbuj ponownie.']);
}

// Limit liczby zgłoszeń z jednego adresu (skrót IP, usuwany po godzinie)
$rateDir = $config['rate_dir'];
@mkdir($rateDir, 0700, true);
foreach (glob($rateDir . '/*') ?: [] as $f) {
    if (filemtime($f) < time() - 3600) @unlink($f);
}
$ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $config['salt']);
$rateFile = $rateDir . '/' . $ipHash;
$count = is_file($rateFile) ? (int)file_get_contents($rateFile) : 0;
if ($count >= $config['limit_per_hour']) {
    respond(false, 429, ['message' => 'Zbyt wiele zgłoszeń w krótkim czasie. Napisz do nas bezpośrednio.']);
}

function clean(string $key, int $max = 200): string {
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) return '';
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim($v);
    return mb_substr($v, 0, $max);
}
function oneLine(string $v): string {
    return trim(preg_replace('/\s+/u', ' ', $v) ?? '');
}

$types = [
    'start' => 'Planuje założyć firmę',
    'firma' => 'Firma lub spółka',
    'rolnik' => 'Gospodarstwo rolne',
    'ngo' => 'Fundacja lub stowarzyszenie',
    'inne' => 'Inna sytuacja',
];
// Pola wymagane i opisy dla każdego rodzaju klienta
$typeFields = [
    'start' => ['start_branza' => ['Planowana działalność', true], 'start_status' => ['Sytuacja zawodowa', true]],
    'firma' => ['firma_forma' => ['Forma prawna', true], 'firma_staz' => ['Staż firmy', true], 'firma_branza' => ['Branża', true], 'firma_cel' => ['Cel finansowania', true]],
    'rolnik' => ['rolnik_cel' => ['Cel', true], 'rolnik_profil' => ['Profil gospodarstwa', false]],
    'ngo' => ['ngo_forma' => ['Forma organizacji', true], 'ngo_staz' => ['Od kiedy działa', true], 'ngo_obszar' => ['Obszar działań', true], 'ngo_zasieg' => ['Zasięg projektu', false]],
    'inne' => ['inne_kto' => ['Kogo dotyczy', true]],
];
$wojewodztwa = ['dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie', 'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie'];

$errors = [];
$type = clean('rodzaj', 20);
if (!isset($types[$type])) $errors['rodzaj'] = 'Wybierz, kim jesteś.';

$rows = [];
if (isset($types[$type])) {
    $rows['Rodzaj klienta'] = $types[$type];
    foreach ($typeFields[$type] as $name => [$label, $required]) {
        $v = oneLine(clean($name));
        if ($required && $v === '') $errors[$name] = 'To pole jest wymagane.';
        if ($v !== '') $rows[$label] = $v;
    }
    if ($type === 'start' && isset($_POST['start_zrodla']) && is_array($_POST['start_zrodla'])) {
        $src = array_slice(array_filter(array_map(fn($s) => is_string($s) ? oneLine(mb_substr($s, 0, 60)) : '', $_POST['start_zrodla'])), 0, 6);
        if ($src) $rows['Interesujące źródła'] = implode(', ', $src);
    }
}

$woj = clean('wojewodztwo', 40);
if (!in_array($woj, $wojewodztwa, true)) $errors['wojewodztwo'] = 'Wybierz województwo.';
else $rows['Województwo'] = $woj;
if (($m = oneLine(clean('miejscowosc', 100))) !== '') $rows['Miejscowość lub powiat'] = $m;

$budzet = oneLine(clean('budzet', 40));
if ($budzet === '') $errors['budzet'] = 'Wybierz orientacyjny budżet.';
else $rows['Budżet'] = $budzet;
if (($term = oneLine(clean('termin', 40))) !== '') $rows['Termin'] = $term;

$opis = clean('opis', 3000);
if (mb_strlen($opis) < 20) $errors['opis'] = 'Napisz trochę więcej, co najmniej 20 znaków.';

$imie = oneLine(clean('imie', 80));
$email = oneLine(clean('email', 160));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Podaj poprawny adres e-mail.';
if (($_POST['zgoda'] ?? '') !== 'tak') $errors['zgoda'] = 'Zaznacz to pole, żebyśmy mogli odpowiedzieć.';

if ($errors) {
    respond(false, 422, ['errors' => $errors, 'message' => 'Formularz zawiera błędy.']);
}

// Zgłoszenia testowe oznacza się słowem TEST na początku opisu
$isTest = str_starts_with(mb_strtoupper($opis), 'TEST') || str_starts_with(mb_strtoupper($imie), 'TEST');

$subject = ($isTest ? '[TEST] ' : '') . 'Zgłoszenie ze strony: ' . $types[$type] . ', ' . $woj;
$lines = ['Nowe zgłoszenie z formularza na kapitalownia.pl', ''];
if ($imie !== '') $lines[] = 'Imię: ' . $imie;
$lines[] = 'E-mail: ' . $email;
$lines[] = '';
foreach ($rows as $k => $v) $lines[] = $k . ': ' . $v;
$lines[] = '';
$lines[] = 'Opis:';
$lines[] = $opis;
$lines[] = '';
$lines[] = '---';
$lines[] = 'Wysłano: ' . date('Y-m-d H:i:s') . ' (czas serwera)';
$lines[] = 'Aby odpowiedzieć, użyj opcji Odpowiedz. Wiadomość trafi na adres zgłaszającego.';
$body = implode("\n", $lines);

$fromName = '=?UTF-8?B?' . base64_encode('Formularz Kapitałownia') . '?=';
$headers = [
    'From' => $fromName . ' <' . $config['from'] . '>',
    'Reply-To' => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64',
    'X-Mailer' => 'kapitalownia-form',
];
$sent = mail(
    $config['to'],
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    chunk_split(base64_encode($body)),
    $headers,
    '-f' . $config['from']
);

if (!$sent) {
    error_log('kapitalownia-form: mail() zwróciło false');
    respond(false, 502, ['message' => 'Serwer nie przyjął wiadomości do wysyłki.']);
}
file_put_contents($rateFile, (string)($count + 1));
// mail() oznacza tylko przyjęcie wiadomości przez serwer pocztowy hostingu
respond(true, 200, ['message' => 'Zgłoszenie przyjęte do wysyłki.']);
