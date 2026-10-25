// Testy strony: budowa, metadane, linki, formularz w przeglądarce i obsługa PHP.
// Wymaga: php w PATH, Chromium z Playwright (PLAYWRIGHT_BROWSERS_PATH lub CHROMIUM_PATH).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, chmodSync, statSync } = require('node:fs');
const { join } = require('node:path');
const os = require('node:os');

const root = join(__dirname, '..');
const tmp = mkdtempSync(join(os.tmpdir(), 'kap-'));
const dist = join(tmp, 'dist');
const mailDir = join(tmp, 'mail');
const port = 8100 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
let server, browser;

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(dir)) return undefined;
  const c = readdirSync(dir).find(d => /^chromium-\d+$/.test(d));
  return c ? join(dir, c, 'chrome-linux', 'chrome') : undefined;
}

before(async () => {
  execFileSync('node', [join(root, 'site/build.mjs'), '--mode=production', '--local', `--out=${dist}`]);
  execFileSync('mkdir', ['-p', mailDir]);
  const catcher = join(tmp, 'sendmail.sh');
  writeFileSync(catcher, `#!/bin/sh\ncat > "${mailDir}/$(date +%s%N).eml"\n`);
  chmodSync(catcher, 0o755);
  server = spawn('php', ['-d', `sendmail_path=${catcher}`, '-S', `127.0.0.1:${port}`, '-t', dist], { stdio: 'ignore', env: { ...process.env, KAP_FORM_LIMIT: '100', KAP_RATE_DIR: join(tmp, 'rate') } });
  for (let i = 0; i < 50; i++) {
    try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  const { chromium } = require('playwright-core');
  browser = await chromium.launch({ executablePath: chromiumPath() });
});
after(async () => { await browser?.close(); server?.kill(); });

const htmlFiles = () => {
  const out = [];
  const walk = d => readdirSync(d).forEach(f => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) out.push(p);
  });
  walk(dist);
  return out;
};
const lastMail = () => {
  const files = readdirSync(mailDir).sort();
  if (!files.length) return null;
  const raw = readFileSync(join(mailDir, files.at(-1)), 'utf8');
  const [head, body] = raw.split(/\r?\n\r?\n/, 2).length === 2 ? [raw.split(/\r?\n\r?\n/)[0], raw.split(/\r?\n\r?\n/).slice(1).join('\n\n')] : [raw, ''];
  const subjEnc = (head.match(/^Subject: =\?UTF-8\?B\?(.+?)\?=/m) || [])[1];
  return { head, subject: subjEnc ? Buffer.from(subjEnc, 'base64').toString() : '', body: Buffer.from(body.replace(/\s+/g, ''), 'base64').toString() };
};
const mailCount = () => readdirSync(mailDir).length;

test('każda strona ma unikalny tytuł, opis i jeden nagłówek h1', () => {
  const titles = new Set();
  for (const f of htmlFiles()) {
    const h = readFileSync(f, 'utf8');
    const title = h.match(/<title>(.+?)<\/title>/)?.[1];
    const desc = h.match(/<meta name="description" content="(.+?)"/)?.[1];
    assert.ok(title, `brak tytułu w ${f}`);
    assert.ok(desc && desc.length > 15, `brak opisu w ${f}`);
    assert.ok(!titles.has(title), `powtórzony tytuł ${title}`);
    titles.add(title);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, `h1 w ${f}`);
    assert.match(h, /<html lang="pl">/);
  }
});

test('treści nie zawierają dawnych marek ani myślników wtrąceniowych', () => {
  for (const f of htmlFiles()) {
    const text = readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /DotacjaPlus|InvestPlan/i, f);
    assert.doesNotMatch(text.replaceAll('Pierwszy biznes – Wsparcie w starcie', ''), / — | – (?!\d)/, `myślnik w ${f}`);
  }
});

test('wszystkie linki wewnętrzne prowadzą do istniejących stron', () => {
  for (const f of htmlFiles()) {
    const h = readFileSync(f, 'utf8');
    for (const [, href] of h.matchAll(/href="(\/[^"#?]*)/g)) {
      const target = href.endsWith('/') ? join(dist, href, 'index.html') : join(dist, href);
      assert.ok(existsSync(target), `${f} -> ${href}`);
    }
  }
});

test('produkcja jest indeksowana, ma sitemap i robots', () => {
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.doesNotMatch(home, /noindex/);
  assert.match(home, /<link rel="canonical" href="https:\/\/kapitalownia.pl\/">/);
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /https:\/\/kapitalownia.pl\/kontakt\//);
  assert.doesNotMatch(sitemap, /dziekujemy|404/);
  assert.match(readFileSync(join(dist, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/kapitalownia.pl\/sitemap.xml/);
  assert.match(readFileSync(join(dist, '404.html'), 'utf8'), /noindex/);
});

test('wersja robocza nie jest indeksowana i nie zawiera obsługi wysyłki', () => {
  const prev = join(tmp, 'preview');
  execFileSync('node', [join(root, 'site/build.mjs'), `--out=${prev}`]);
  assert.match(readFileSync(join(prev, 'index.html'), 'utf8'), /<meta name="robots" content="noindex, nofollow">/);
  assert.equal(readFileSync(join(prev, 'robots.txt'), 'utf8').trim(), 'User-agent: *\nDisallow: /');
  assert.match(readFileSync(join(prev, '.htaccess'), 'utf8'), /X-Robots-Tag "noindex, nofollow"/);
  assert.ok(!existsSync(join(prev, 'api')));
});

test('produkcja nie buduje się bez NIP usługodawcy', () => {
  const cfg = JSON.parse(readFileSync(join(root, 'site/site.json'), 'utf8'));
  cfg.firma.nip = '';
  const f = join(tmp, 'site-bez-nip.json');
  writeFileSync(f, JSON.stringify(cfg));
  assert.throws(() => execFileSync('node', [join(root, 'site/build.mjs'), '--mode=production', `--out=${join(tmp, 'x')}`], { stdio: 'pipe', env: { ...process.env, KAP_SITE_JSON: f } }));
});

test('polityka i regulamin identyfikują usługodawcę po NIP bez placeholderów', () => {
  for (const f of ['polityka-prywatnosci/index.html', 'regulamin/index.html']) {
    const h = readFileSync(join(dist, f), 'utf8');
    assert.match(h, /NIP 7393982505/, f);
    assert.doesNotMatch(h, /do uzupełnienia przed publikacją/, f);
  }
});

async function fillCommon(p, email = 'test@example.com') {
  await p.selectOption('#f-wojewodztwo', 'warmińsko-mazurskie');
  await p.selectOption('#f-budzet', 'Do 50 tys. zł');
  await p.fill('#f-opis', 'TEST techniczny formularza. To nie jest zgłoszenie klienta.');
  await p.fill('#f-email', email);
  await p.press('#f-email', 'Tab');
  await p.check('#f-zgoda');
}
const scenarios = {
  start: async p => { await p.fill('#f-start_branza', 'Usługi remontowe'); await p.selectOption('#f-start_status', { index: 1 }); await p.check('input[value="PFRON"]'); },
  firma: async p => { await p.selectOption('#f-firma_forma', { index: 1 }); await p.selectOption('#f-firma_staz', { index: 2 }); await p.fill('#f-firma_branza', 'Stolarstwo'); await p.selectOption('#f-firma_cel', { index: 1 }); },
  rolnik: async p => { await p.selectOption('#f-rolnik_cel', { index: 2 }); },
  ngo: async p => { await p.selectOption('#f-ngo_forma', 'Fundacja'); await p.selectOption('#f-ngo_staz', { index: 1 }); await p.fill('#f-ngo_obszar', 'Edukacja'); },
  inne: async p => { await p.fill('#f-inne_kto', 'Spółdzielnia'); }
};

for (const [type, fill] of Object.entries(scenarios)) {
  test(`formularz wysyła ścieżkę "${type}" i serwer przekazuje wiadomość`, async () => {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await p.goto(base + '/kontakt/');
      await p.click(`input[name="rodzaj"][value="${type}"]`, { force: true });
      await fill(p);
      await fillCommon(p);
      await p.waitForTimeout(3100); // ochrona przed zbyt szybkim wysłaniem
      const before = mailCount();
      await p.click('button[type="submit"]');
      await p.waitForSelector('#form-success:not([hidden])', { timeout: 5000 });
      assert.equal(mailCount(), before + 1);
      const m = lastMail();
      assert.match(m.subject, /^\[TEST\] Zgłoszenie ze strony/);
      assert.match(m.head, /^To: kapitalownia@gmail.com/m);
      assert.match(m.head, /^Reply-To: test@example.com/m);
      assert.match(m.body, /warmińsko-mazurskie/);
      // Pola innych ścieżek nie trafiają do wiadomości
      for (const other of Object.keys(scenarios).filter(t => t !== type)) {
        assert.doesNotMatch(m.body, new RegExp(other === 'start' ? 'Sytuacja zawodowa' : other === 'ngo' ? 'Forma organizacji' : other === 'firma' ? 'Forma prawna' : other === 'rolnik' ? 'Profil gospodarstwa|Cel:' : 'Kogo dotyczy'));
      }
    } finally { await p.close(); }
  });
}

test('walidacja w przeglądarce blokuje błędny e-mail i brak wyboru', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(base + '/kontakt/');
    const before = mailCount();
    await p.click('button[type="submit"]');
    assert.ok(await p.isVisible('#form-errors'));
    assert.ok(await p.isVisible('#f-rodzaj-error'));
    await p.click('input[value="inne"]', { force: true });
    await p.fill('#f-inne_kto', 'X');
    await fillCommon(p, 'zly-adres');
    await p.click('button[type="submit"]');
    assert.equal(await p.getAttribute('#f-email', 'aria-invalid'), 'true');
    assert.equal(mailCount(), before);
  } finally { await p.close(); }
});

test('serwer odrzuca niepełne dane, metodę GET i boty', async () => {
  const post = body => fetch(base + '/api/formularz.php', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const before = mailCount();
  let r = await post({ rodzaj: 'firma', wojewodztwo: 'mazowieckie', budzet: 'x', opis: 'za krótko', email: 'a@b.pl', zgoda: 'tak' });
  assert.equal(r.status, 422);
  const j = await r.json();
  assert.ok(j.errors.firma_forma && j.errors.opis);
  r = await post({ rodzaj: 'inne', inne_kto: 'x', wojewodztwo: 'Atlantyda', budzet: 'x', opis: 'x'.repeat(30), email: 'a@b.pl', zgoda: 'tak' });
  assert.equal(r.status, 422);
  r = await post({ www: 'spam', rodzaj: 'inne' });
  assert.equal(r.status, 200);
  r = await post({ rodzaj: 'inne', inne_kto: 'x', wojewodztwo: 'mazowieckie', budzet: 'x', opis: 'x'.repeat(30), email: "a@b.pl\r\nBcc: ofiara@example.com", zgoda: 'tak' });
  assert.equal(r.status, 422, 'wstrzyknięcie nagłówka musi być odrzucone');
  r = await fetch(base + '/api/formularz.php');
  assert.equal(r.status, 405);
  assert.equal(mailCount(), before);
});

test('wysyłka bez JavaScriptu przekierowuje na stronę podziękowania', async () => {
  const r = await fetch(base + '/api/formularz.php', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-For': '1' }, body: new URLSearchParams({ rodzaj: 'rolnik', rolnik_cel: 'Inny cel', wojewodztwo: 'opolskie', budzet: 'Nie wiem jeszcze', opis: 'TEST bez JavaScriptu, nie jest to zgłoszenie.', email: 'test@example.com', zgoda: 'tak' }) });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/dziekujemy/');
});

test('menu mobilne otwiera się i zamyka klawiszem Escape', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await p.goto(base + '/');
    assert.equal(await p.isVisible('#menu a[href="/zamow/"]'), false);
    await p.click('.nav-toggle');
    assert.ok(await p.isVisible('#menu a[href="/zamow/"]'));
    await p.keyboard.press('Escape');
    assert.equal(await p.getAttribute('.nav-toggle', 'aria-expanded'), 'false');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, 'brak poziomego przewijania na telefonie');
  } finally { await p.close(); }
});

test('brak naruszeń dostępności (axe, poziom WCAG AA)', async () => {
  const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  for (const path of ['/', '/oferta/', '/finansowanie-na-start/', '/zamow/', '/kontakt/', '/zamowienie/', '/faq/', '/regulamin/', '/polityka-prywatnosci/', '/404.html']) {
    const p = await browser.newPage();
    try {
      await p.goto(base + path);
      await p.addScriptTag({ content: axe });
      const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(v => `${v.id}: ${v.nodes.length}`));
      assert.deepEqual(res, [], path);
    } finally { await p.close(); }
  }
});

test('lista usług w config.php zgadza się z site/uslugi.json', () => {
  const json = JSON.parse(readFileSync(join(root, 'site/uslugi.json'), 'utf8')).uslugi.map(u => u.id).sort();
  const php = JSON.parse(execFileSync('php', ['-r', `echo json_encode(array_keys((require '${join(root, 'site/public/api/config.php')}')['uslugi']));`]).toString()).sort();
  assert.deepEqual(php, json);
});

test('cennik bez ceny i linku Stripe kieruje do wyceny, a nie do płatności', () => {
  const h = readFileSync(join(dist, 'zamow/index.html'), 'utf8');
  const uslugi = JSON.parse(readFileSync(join(root, 'site/uslugi.json'), 'utf8')).uslugi;
  for (const u of uslugi) {
    assert.match(h, new RegExp(`id="usluga-${u.id}"`));
    if (typeof u.cena !== 'number' || !u.stripe) assert.match(h, new RegExp(`href="/kontakt/\\?usluga=${u.id}"`));
    else assert.ok(h.includes(`href="${u.stripe}"`));
  }
  for (const [, href] of h.matchAll(/href="(https:\/\/buy\.stripe\.com[^"]*)"/g)) assert.match(href, /^https:\/\/buy\.stripe\.com\//);
});

test('pierwszy ekran pokazuje kwoty, cenę z płatnością po sukcesie i dowody zaufania', () => {
  const h = readFileSync(join(dist, 'index.html'), 'utf8');
  const hero = h.split('class="hero hero--home"')[1].split('</section>')[0];
  assert.match(hero, /do 184\u00a0662 zł|do 184 662 zł/);
  assert.match(hero, /850 zł na start/);
  assert.match(hero, /211 wniosków ocenionych pozytywnie/);
  assert.match(hero, /NIP 7393982505/);
  assert.match(hero, /href="\/ocena-szans\/"/);
});

test('link z programu wybiera usługę w formularzu', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(base + '/kontakt/?usluga=pfron');
    assert.equal(await p.inputValue('#f-usluga'), 'pfron');
  } finally { await p.close(); }
});

test('ankieta po płatności wymaga usługi i oznacza wiadomość jako zamówienie', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(base + '/zamowienie/?usluga=wws');
    assert.equal(await p.getAttribute('meta[name="robots"]', 'content'), 'noindex, nofollow');
    await p.click('input[name="rodzaj"][value="start"]', { force: true });
    await scenarios.start(p);
    await fillCommon(p);
    await p.check('#f-start_teraz');
    await p.waitForTimeout(3100);
    await p.click('button[type="submit"]');
    await p.waitForSelector('#form-success:not([hidden])', { timeout: 5000 });
    const m = lastMail();
    assert.match(m.subject, /^\[TEST\] \[ZAMÓWIENIE\]/);
    assert.match(m.body, /Usługa: Dokumenty do pożyczki Wsparcie w starcie/);
    assert.match(m.body, /Rozpoczęcie przed upływem 14 dni: TAK/);
  } finally { await p.close(); }
  const r = await fetch(base + '/api/formularz.php', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ zamowienie: 'tak', rodzaj: 'inne', inne_kto: 'x', wojewodztwo: 'mazowieckie', budzet: 'x', opis: 'x'.repeat(30), email: 'a@b.pl', zgoda: 'tak' }) });
  assert.equal(r.status, 422);
  assert.ok((await r.json()).errors.usluga);
});

const allPaths = ['/', '/oferta/', '/finansowanie-na-start/', '/rozwoj-firmy/', '/fundacje-i-stowarzyszenia/', '/wspolpraca/', '/faq/', '/zamow/', '/kontakt/', '/zamowienie/', '/regulamin/', '/polityka-prywatnosci/', '/dziekujemy/', '/404.html'];

test('każda podstrona bez poziomego przewijania przy 320, 768, 1024 i 1440 px', async () => {
  for (const width of [320, 768, 1024, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      for (const path of allPaths) {
        await p.goto(base + path);
        const wide = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(wide <= 0, `${path} przy ${width}px wystaje o ${wide}px`);
      }
    } finally { await p.close(); }
  }
});

test('brak błędów w konsoli i niezaładowanych zasobów', async () => {
  const p = await browser.newPage();
  const problems = [];
  p.on('console', m => { if (m.type() === 'error') problems.push(`${p.url()}: ${m.text()}`); });
  p.on('pageerror', e => problems.push(`${p.url()}: ${e.message}`));
  p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) problems.push(`${r.status()} ${r.url()}`); });
  try {
    for (const path of allPaths.filter(x => x !== '/404.html')) {
      await p.goto(base + path, { waitUntil: 'networkidle' });
      const broken = await p.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
      assert.deepEqual(broken, [], path);
      const fonts = await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'error').map(f => f.family); });
      assert.deepEqual(fonts, [], path);
    }
    assert.deepEqual(problems, []);
  } finally { await p.close(); }
});

test('formularz da się wypełnić i wysłać samą klawiaturą', async () => {
  const p = await browser.newPage();
  try {
    await p.goto(base + '/kontakt/');
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.className), 'skip', 'pierwszy Tab trafia w link do treści');
    await p.focus('#f-rodzaj');
    await p.keyboard.press('ArrowDown'); // firma
    assert.equal(await p.evaluate(() => document.querySelector('input[name="rodzaj"]:checked').value), 'firma');
    assert.equal(await p.isVisible('#f-firma_forma'), true);
    await p.focus('#f-firma_forma');
    for (const id of ['#f-firma_forma', '#f-firma_staz', '#f-firma_cel']) { await p.focus(id); await p.keyboard.press('ArrowDown'); }
    await p.focus('#f-firma_branza'); await p.keyboard.type('Stolarstwo');
    await p.focus('#f-wojewodztwo'); await p.keyboard.press('ArrowDown');
    await p.focus('#f-budzet'); await p.keyboard.press('ArrowDown');
    await p.focus('#f-opis'); await p.keyboard.type('TEST obsługi klawiaturą, nie jest to zgłoszenie klienta.');
    await p.focus('#f-email'); await p.keyboard.type('test@example.com');
    await p.focus('#f-zgoda'); await p.keyboard.press('Space');
    await p.waitForTimeout(3100);
    await p.focus('button[type="submit"]'); await p.keyboard.press('Enter');
    await p.waitForSelector('#form-success:not([hidden])', { timeout: 5000 });
    assert.equal(await p.evaluate(() => document.activeElement.id), 'form-success', 'fokus przechodzi na potwierdzenie');
  } finally { await p.close(); }
});

test('bez JavaScriptu formularz pokazuje wszystkie sekcje i da się go wysłać', async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  try {
    await p.goto(base + '/kontakt/');
    for (const t of ['start', 'firma', 'rolnik', 'ngo', 'inne']) assert.ok(await p.isVisible(`fieldset[data-type="${t}"]`), t);
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(await p.isVisible('#menu a[href="/zamow/"]'), 'menu bez JavaScriptu jest rozwinięte');
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.check('input[value="inne"]', { force: true });
    await p.fill('#f-inne_kto', 'Spółdzielnia');
    await p.selectOption('#f-wojewodztwo', 'opolskie');
    await p.selectOption('#f-budzet', 'Nie wiem jeszcze');
    await p.fill('#f-opis', 'TEST bez JavaScriptu, nie jest to zgłoszenie klienta.');
    await p.fill('#f-email', 'test@example.com');
    await p.check('#f-zgoda');
    await p.click('button[type="submit"]');
    await p.waitForURL(/\/dziekujemy\/$/);
  } finally { await ctx.close(); }
});

test('strona nie przesuwa układu po wczytaniu skryptu (CLS)', async () => {
  for (let i = 0; i < 10; i++) {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // Opóźniony skrypt odtwarza wolne łącze, przy którym przesunięcie było widoczne
    await p.route('**/assets/site.*.js', async r => { await new Promise(res => setTimeout(res, 400)); await r.continue(); });
    try {
      await p.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      await p.goto(base + (i % 2 ? '/kontakt/' : '/'), { waitUntil: 'networkidle' });
      await p.waitForTimeout(300);
      const cls = await p.evaluate(() => window.__cls);
      assert.ok(cls < 0.05, `CLS ${cls.toFixed(3)} w próbie ${i + 1}`);
    } finally { await p.close(); }
  }
});

test('szkic formularza wraca po odświeżeniu i znika po wysłaniu', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  try {
    await p.goto(base + '/kontakt/');
    await p.click('input[name="rodzaj"][value="inne"]', { force: true });
    await p.fill('#f-inne_kto', 'Spółdzielnia');
    await fillCommon(p);
    await p.reload();
    assert.equal(await p.inputValue('#f-inne_kto'), 'Spółdzielnia');
    assert.equal(await p.isChecked('input[name="rodzaj"][value="inne"]'), true);
    assert.equal(await p.isChecked('#f-zgoda'), false, 'zgoda nie jest zapamiętywana');
    await p.check('#f-zgoda');
    await p.waitForTimeout(3100);
    await p.click('button[type="submit"]');
    await p.waitForSelector('#form-success:not([hidden])', { timeout: 5000 });
    assert.equal(await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kapitalownia-szkic')).length), 0);
  } finally { await ctx.close(); }
});

test('bez linków Stripe nie ma przycisków zakupu ani obietnicy płatności online', () => {
  const uslugi = JSON.parse(readFileSync(join(root, 'site/uslugi.json'), 'utf8')).uslugi;
  if (uslugi.some(u => typeof u.cena === 'number' && u.stripe)) return;
  for (const f of ['index.html', 'finansowanie-na-start/index.html', 'zamow/index.html']) {
    const h = readFileSync(join(dist, f), 'utf8');
    assert.doesNotMatch(h, />Zamów wniosek</, f);
    assert.doesNotMatch(h, /stronę płatności Stripe/, f);
  }
  assert.match(readFileSync(join(dist, 'zamow/index.html'), 'utf8'), /Wycena e-mailem/);
});

test('stopka na telefonie ma odstęp od linii podziału', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await p.goto(base + '/');
    assert.ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.site-footer__bottom')).paddingTop)) >= 16);
  } finally { await p.close(); }
});

test('usługi z ceną pokazują opłatę początkową, success fee i łączny koszt', () => {
  const h = readFileSync(join(dist, 'zamow/index.html'), 'utf8');
  const uslugi = JSON.parse(readFileSync(join(root, 'site/uslugi.json'), 'utf8')).uslugi;
  for (const u of uslugi.filter(x => typeof x.cena === 'number' && x.successFee)) {
    const card = h.split(`id="usluga-${u.id}"`)[1].split('</article>')[0];
    assert.match(card, new RegExp(`${u.cena} zł`));
    if (typeof u.successFee === 'string') {
      // procent kwoty, np. 5% grantu, zamiast kwoty w złotych
      assert.ok(card.includes(`+ ${u.successFee}`));
      if (u.netto) assert.match(card, new RegExp(`${u.cena} zł netto`));
    } else {
      assert.match(card, new RegExp(`\\+ ${u.successFee.toLocaleString('pl-PL').replace(/ /g, ' ')} zł ${u.feeKiedy || 'po przyznaniu środków'}`));
      assert.match(card, /Łącznie/);
    }
    assert.ok(card.includes(u.stripe ? `href="${u.stripe}"` : `href="/kontakt/?usluga=${u.id}"`));
  }
});
