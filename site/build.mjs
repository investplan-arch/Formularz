// Generator strony Kapitałowni.
// Użycie: node site/build.mjs [--mode=production|preview] [--flat] [--home=plik.html] [--out=katalog] [--local]
//   production  wersja na kapitalownia.pl (indeksowana, formularz wysyła dane)
//   preview     wersja robocza (noindex, formularz nie wysyła danych)
//   --flat      linki do plików .html zamiast katalogów (podgląd bez serwera)
//   --local     produkcja do testów lokalnych, bez wymogu danych firmy
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { marked } from 'marked';
import { formHtml } from './templates/form.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const mode = args.mode === 'production' ? 'production' : 'preview';
const flat = Boolean(args.flat);
const out = args.out ? String(args.out) : join(root, '..', mode === 'production' ? 'dist' : 'dist-preview');
const readJson = f => JSON.parse(readFileSync(join(root, f), 'utf8'));
const site = process.env.KAP_SITE_JSON ? JSON.parse(readFileSync(process.env.KAP_SITE_JSON, 'utf8')) : readJson('site.json');
const { programy, zrodla, sprawdzono } = readJson('programy.json');
const { uslugi } = readJson('uslugi.json');
const { opinie } = readJson('opinie.json');
const wyn = readJson('wynagrodzenie.json');
const wynDni = Math.round((Date.now() - new Date(wyn.komunikat)) / 864e5);
if (wynDni > 100) console.log(`Uwaga, przeciętne wynagrodzenie w site/wynagrodzenie.json ma ${wynDni} dni. Sprawdź nowy komunikat GUS.`);
const updated = new Date().toISOString().slice(0, 10);
const updatedText = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const buyable = u => typeof u.cena === 'number' && Boolean(u.stripe);
const payments = uslugi.some(buyable);

// Dane firmy są wymagane w polityce prywatności i regulaminie
const firma = site.firma;
// Wymagany jest co najmniej NIP. Nazwa i adres są opcjonalne (jednoosobowa
// działalność może nie chcieć publikować imienia i nazwiska wprost).
const nipOk = /^\d{10}$/.test(String(firma.nip || '').replace(/\D/g, ''));
const firmaFilled = nipOk;
if (mode === 'production' && !firmaFilled && !args.local) {
  console.error('Brak poprawnego NIP w site/site.json (firma.nip). Polityka prywatności i regulamin nie mogą zostać opublikowane bez danych identyfikujących usługodawcę.');
  process.exit(1);
}
const missing = label => `<mark>[${label} do uzupełnienia przed publikacją]</mark>`;
const ceidg = 'https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/search.aspx';
const firmaText = firmaFilled
  ? [firma.nazwa || 'Kapitałownia, jednoosobowa działalność gospodarcza', firma.adres, `NIP ${firma.nip}`, firma.regon_krs].filter(Boolean).join(', ') +
    ` (pełne dane rejestrowe w <a href="${ceidg}" rel="noopener">CEIDG</a> po numerze NIP)`
  : missing('dane firmy');
const firmaFooter = firmaFilled ? `NIP ${firma.nip}` : '';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pln = n => n.toLocaleString('pl-PL').replace(/ /g, ' ') + ' zł';
const zl = n => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, '\u00a0') + '\u00a0zł';

function fileFor(path) {
  if (path === '/') return flat && args.home ? String(args.home) : 'index.html';
  if (path.endsWith('.html')) return path.slice(1);
  return flat ? path.slice(1, -1) + '.html' : path.slice(1) + 'index.html';
}
// W trybie flat wszystkie strony leżą w katalogu głównym, więc linki są względne
function rewriteLinks(html) {
  if (!flat) return html;
  return html
    .replace(/(href|src)="\/assets\//g, '$1="assets/')
    .replace(/href="\/([^"]*)"/g, (_, rest) => {
      const [p, hash] = ('/' + rest).split('#');
      const [pp, query] = p.split('?');
      return `href="${fileFor(pp)}${query ? '?' + query : ''}${hash ? '#' + hash : ''}"`;
    });
}

// Komentarze HTML w treściach (np. TODO do weryfikacji) zostają tylko w repozytorium
const stripComments = md => md.replace(/<!--[\s\S]*?-->\n?/g, '');
function md2html(md) {
  return marked.parse(stripComments(md)).replace(/<h([23])>(.*?) \{#([\w-]+)\}<\/h\1>/g, '<h$1 id="$3">$2</h$1>');
}
const arrow = '<span aria-hidden="true"> →</span>';

// Elementy wielokrotnego użytku
function statsHtml(variant = '') {
  return `<dl class="stats${variant ? ' stats--' + variant : ''}">${site.stats.map(s => `<div class="stat">
    <dt class="stat__label">${esc(s.label)}</dt>
    <dd class="stat__value${s.value != null ? '' : ' stat__value--text'}">${s.value != null ? `<span data-count="${s.value}">${s.value}</span>` : esc(s.text)}</dd>
  </div>`).join('')}</dl>`;
}

const star = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill="currentColor"/></svg>';
function opinieHtml() {
  return `<div class="reviews">${opinie.map((o, i) => `<figure class="review">
    <blockquote class="review__text"><p>${esc(o.tekst)}</p></blockquote>
    <figcaption class="review__author"><span>${esc(o.autor)}</span><span class="review__stars" role="img" aria-label="Ocena ${o.ocena} na 5">${star.repeat(o.ocena)}</span></figcaption>
  </figure>`).join('')}</div>`;
}

function programCard(g) {
  const row = (label, value) => `<div class="program__row"><dt>${label}</dt><dd>${value}</dd></div>`;
  return `<article class="program" id="program-${g.id}">
    <header class="program__head">
      <p class="program__type"><span class="tag${g.typ.startsWith('Pożyczka') ? ' tag--yellow' : g.typ === 'Premia' ? ' tag--green' : ''}">${esc(g.typ)}</span></p>
      <h3>${esc(g.nazwa)}</h3>
    </header>
    <div class="program__amount"><span class="program__amount-label">Kwota</span><strong>${esc(g.kwota)}</strong><p>${esc(g.kwotaUwaga)}</p></div>
    <dl class="program__rows">
      ${row('Dla kogo', esc(g.dlaKogo))}
      ${row('Forma', esc(g.forma))}
      ${row('Nabór', esc(g.nabor))}
      ${row('Na co', esc(g.naCo))}
      ${row('Plusy i minusy', `<ul class="pm">${g.plusy.map(p => `<li class="pm--plus">${esc(p)}</li>`).join('')}${g.minusy.map(m => `<li class="pm--minus">${esc(m)}</li>`).join('')}</ul>`)}
    </dl>
    <div class="program__actions">
      <a class="btn btn--primary" href="/kontakt/?usluga=${g.usluga}">Sprawdź kwalifikację</a>
      ${uslugi.some(u => u.id === g.usluga && buyable(u)) ? `<a class="btn btn--ghost" href="/zamow/#usluga-${g.usluga}">Zamów wniosek</a>` : ''}
    </div>
    ${g.link ? `<p class="program__more"><a class="textlink" href="${g.link}">Wszystko o programie${arrow}</a></p>` : ''}
  </article>`;
}
function programCompact(g) {
  return `<a class="pcompact" href="${g.link || `/finansowanie-na-start/#program-${g.id}`}">
    <span class="tag${g.typ.startsWith('Pożyczka') ? ' tag--yellow' : g.typ === 'Premia' ? ' tag--green' : ''}">${esc(g.typ)}</span>
    <span class="pcompact__name">${esc(g.nazwa)}</span>
    <span class="pcompact__amount">${esc(g.kwota)}</span>
    <span class="pcompact__who">${esc(g.dlaKogo)}</span>
    <span class="pcompact__more">Warunki i źródła${arrow}</span>
  </a>`;
}
function programsHtml(ids, compact) {
  const list = ids ? ids.split(/[\s,]+/).map(id => programy.find(p => p.id === id)).filter(Boolean) : programy;
  return compact ? `<div class="pcompacts">${list.map(programCompact).join('')}</div>` : `<div class="programs">${list.map(programCard).join('')}</div>`;
}
function sourcesHtml() {
  return `<aside class="sources" aria-label="Źródła">
    <p><strong>Dane sprawdzone: ${esc(sprawdzono)}.</strong> Kwoty i warunki pochodzą ze stron instytucji publicznych. Przed złożeniem wniosku zawsze sprawdzamy aktualny regulamin konkretnego naboru.</p>
    <ul>${zrodla.map(z => `<li><a href="${esc(z.href)}" rel="noopener">${esc(z.label)}</a></li>`).join('')}</ul>
  </aside>`;
}

function serviceCard(u) {
  const priced = typeof u.cena === 'number';
  const buy = buyable(u);
  const fee = typeof u.successFee === 'number' ? u.successFee : 0;
  // successFee jako tekst, gdy druga część to procent kwoty (np. 5% grantu)
  const feeText = typeof u.successFee === 'string' ? u.successFee : '';
  const netto = u.netto ? ' netto' : '';
  // feeKiedy i feeTotal opisują drugą część opłaty, gdy nie zależy od przyznania środków (np. wpis do KRS)
  const feeKiedy = u.feeKiedy || 'po przyznaniu środków';
  const feeTotal = u.feeTotal || (priced ? `Łącznie ${pln(u.cena + fee)}, jeśli otrzymasz finansowanie. Jeśli nie, płacisz tylko ${pln(u.cena)}.` : '');
  const price = priced
    ? `<div class="service__price"><p><strong>${pln(u.cena)}${netto}</strong> <span>${fee || feeText ? 'na start, ' : ''}płatne przy zamówieniu</span></p>${u.uwaga ? `<p class="service__total">${esc(u.uwaga)}</p>` : ''}${fee ? `<p class="service__fee">+ ${pln(fee)} ${esc(feeKiedy)}</p><p class="service__total">${esc(feeTotal)}</p>` : ''}${feeText ? `<p class="service__fee">+ ${esc(feeText)}</p>${u.feeTotal ? `<p class="service__total">${esc(u.feeTotal)}</p>` : ''}` : ''}</div>`
    : '<p class="service__price service__price--quote">Wycena indywidualna</p>';
  const cta = buy
    ? `<a class="btn btn--primary" href="${esc(u.stripe)}" rel="noopener">Zamawiam i płacę</a>`
    : `<a class="btn btn--primary" href="/kontakt/?usluga=${u.id}">${priced ? 'Zamawiam' : 'Poproś o wycenę'}</a>`;
  return `<article class="service" id="usluga-${u.id}">
    <h3>${esc(u.nazwa)}</h3>
    <p>${esc(u.opis)}</p>
    <ul class="checklist">${u.zakres.map(z => `<li>${esc(z)}</li>`).join('')}</ul>
    <div class="service__foot">${price}${cta}</div>
  </article>`;
}

// Kalkulator limitów. Mnożniki wynikają z przepisów, kwota bazowa z komunikatu GUS.
const limity = [
  { id: 'pup', nazwa: 'Dotacja z urzędu pracy', x: 6, typ: 'Dotacja', link: '/dotacja-z-urzedu-pracy/', uwaga: 'Górny limit z ustawy. Każdy urząd ustala własny limit, w naborach z 2026 roku najczęściej od 30 do 40 tys. zł.' },
  { id: 'pfron', nazwa: 'Środki PFRON, firma przez 12 miesięcy', x: 6, typ: 'Dotacja', link: '/finansowanie-na-start/#program-pfron', uwaga: 'Dla osób z orzeczeniem o niepełnosprawności, przy zobowiązaniu do prowadzenia firmy co najmniej 12 miesięcy.' },
  { id: 'pfron24', nazwa: 'Środki PFRON, firma przez 24 miesiące', x: 15, typ: 'Dotacja', link: '/finansowanie-na-start/#program-pfron', uwaga: 'Wyższy limit przy zobowiązaniu do prowadzenia firmy co najmniej 24 miesiące.' },
  { id: 'wws', nazwa: 'Pożyczka BGK Wsparcie w starcie', x: 20, typ: 'Pożyczka', link: '/wsparcie-w-starcie/', uwaga: 'Pożyczkę trzeba spłacić, w czasie do 7 lat. Pośrednik ocenia zdolność do spłaty.' }
];
const dataGus = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(wyn.komunikat));

// Pierwszy ekran strony głównej: co robimy, ile można dostać, ile to kosztuje i dlaczego warto zaufać
const heroLimity = [
  { nazwa: 'Dotacja z urzędu pracy', x: 6, link: '/dotacja-z-urzedu-pracy/', opis: 'bezzwrotnie, urzędy dają zwykle od 30 do 40 tys. zł' },
  { nazwa: 'Środki PFRON', x: 15, link: '/finansowanie-na-start/#program-pfron', opis: 'bezzwrotnie, dla osób z orzeczeniem o niepełnosprawności' },
  { nazwa: 'Pożyczka Wsparcie w starcie', x: 20, link: '/wsparcie-w-starcie/', opis: '0,25% rocznie, także dla pracujących z zarobkami do średniej krajowej' }
];
function homeHeroHtml(hero) {
  const start = uslugi.find(u => u.id === 'pup');
  const price = start && typeof start.cena === 'number' && start.successFee
    ? `<p class="hero__price"><strong>Wniosek z biznesplanem za ${pln(start.cena + start.successFee)}.</strong> Płacisz ${pln(start.cena)} na start, a ${pln(start.successFee)} dopiero po przyznaniu środków. Jeśli wniosek nie przejdzie, drugiej części nie płacisz.</p>`
    : '';
  const proof = [
    opinie.length ? `<li><a href="#opinie"><span class="hero__stars" aria-hidden="true">${star.repeat(5)}</span>5 na 5 w opiniach klientów</a></li>` : '',
    ...site.stats.filter(st => st.value != null).map(st => `<li>${esc(st.value)} ${esc(st.label)}</li>`),
    firmaFooter ? `<li>firma w CEIDG, ${esc(firmaFooter)}</li>` : ''
  ].filter(Boolean).join('');
  const rows = heroLimity.map(l => `<li><a href="${l.link}"><span class="hero-panel__name">${esc(l.nazwa)}</span><span class="hero-panel__amount">do ${pln(Math.floor(l.x * wyn.kwota))}</span><span class="hero-panel__note">${esc(l.opis)}</span></a></li>`).join('');
  const messenger = site.messenger ? `<a class="btn btn--ghost btn--large" href="${esc(site.messenger)}" rel="noopener">Napisz na Messengerze</a>` : '';
  return `<section class="hero hero--home">
    <div class="wrap"><h1 class="hero__title">${esc(hero.title)}</h1></div>
    <div class="wrap hero__grid">
      <div class="hero__text">
        ${hero.lead ? `<p class="lead">${esc(hero.lead)}</p>` : ''}
        <p class="hero__actions"><a class="btn btn--primary btn--large" href="${hero.ctaHref || '/ocena-szans/'}">${esc(hero.cta || 'Bezpłatna ocena szans')}</a>${messenger}</p>
        ${price}
        ${proof ? `<ul class="hero__proof">${proof}</ul>` : ''}
      </div>
      <aside class="hero-panel" aria-labelledby="hero-panel-h">
        <h2 class="hero-panel__title" id="hero-panel-h">Ile można dostać na start</h2>
        <ul class="hero-panel__list">${rows}<li><a href="/finansowanie-na-start/#program-lgd"><span class="hero-panel__name">Premia z Lokalnej Grupy Działania</span><span class="hero-panel__amount hero-panel__amount--text">kwota z ogłoszenia LGD</span><span class="hero-panel__note">dla firm na obszarze działania LGD</span></a></li></ul>
        <p class="hero-panel__foot">Górne limity z ustawy, liczone od przeciętnego wynagrodzenia z GUS za ${esc(wyn.okres)}. <a href="/kalkulator-dotacji/">Policz w kalkulatorze</a></p>
      </aside>
    </div>
  </section>`;
}
function kalkulatorHtml() {
  const rows = limity.map(l => `<tr data-limit="${(l.x * wyn.kwota).toFixed(2)}">
      <th scope="row"><a href="${l.link}">${esc(l.nazwa)}</a> <span class="calc__type">${l.typ}</span></th>
      <td class="calc__x">${l.x} ×</td>
      <td class="calc__max"><strong>${zl(l.x * wyn.kwota)}</strong></td>
      <td class="calc__fit"></td>
    </tr>`).join('');
  return `<div class="calc">
    <form class="calc__form" id="kalkulator" novalidate>
      <label for="calc-kwota">Ile potrzebujesz na start firmy?</label>
      <div class="calc__input"><input id="calc-kwota" name="kwota" inputmode="numeric" autocomplete="off" placeholder="np. 45 000" aria-describedby="calc-hint"><span aria-hidden="true">zł</span></div>
      <p class="small" id="calc-hint">Wpisz kwotę planowanych wydatków. Zaznaczymy, które programy mogą ją pokryć.</p>
      <p class="calc__summary" id="calc-wynik" aria-live="polite"></p>
    </form>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Limity programów"><table class="calc__table">
      <caption>Maksymalne kwoty na start firmy przy przeciętnym wynagrodzeniu ${zl(wyn.kwota)}</caption>
      <thead><tr><th scope="col">Program</th><th scope="col">Mnożnik</th><th scope="col">Maksymalnie</th><th scope="col"><span class="visually-hidden">Twoja kwota</span></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <ul class="calc__notes">${limity.map(l => `<li><strong>${esc(l.nazwa)}.</strong> ${esc(l.uwaga)}</li>`).join('')}<li><strong>Premia z LGD.</strong> Kwotę określa Lokalna Grupa Działania w ogłoszeniu naboru, nie wynika z przeciętnego wynagrodzenia.</li></ul>
    <p class="small sources-note">Kwota bazowa to przeciętne wynagrodzenie za ${esc(wyn.okres)} z <a href="${esc(wyn.zrodlo)}" rel="noopener">komunikatu Prezesa GUS</a> z ${dataGus}. Urząd liczy limit od wartości obowiązującej w dniu podpisania umowy, więc kwota zmienia się co kwartał.</p>
  </div>`;
}
// Próg przychodu w pożyczce Wsparcie w starcie, zaokrąglony w dół do 100 zł
const tys = n => (Math.floor(n / 100) / 10).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '\u00a0tys.\u00a0zł';
const pytania = [
  { name: 'status', q: 'Jaka jest Twoja sytuacja zawodowa?', opts: [['bezrobotny', 'Mam status osoby bezrobotnej w urzędzie pracy'], ['poszukujacy', 'Mam status osoby poszukującej pracy i nie pracuję'], ['niepracuje', 'Nie pracuję i nie jestem zarejestrowany w urzędzie pracy'], ['pracuje-nisko', `Pracuję na etacie lub umowie i zarabiam do ${tys(wyn.kwota)} brutto miesięcznie`], ['pracuje', `Pracuję na etacie lub umowie i zarabiam więcej niż ${tys(wyn.kwota)} brutto`], ['student', 'Studiuję, to mój ostatni rok, i nie pracuję'], ['inne', 'Inna sytuacja']] },
  { name: 'firma', q: 'Czy w ostatnich 12 miesiącach była zarejestrowana na Ciebie firma, także zawieszona?', opts: [['nie', 'Nie'], ['tak', 'Tak']] },
  { name: 'orzeczenie', q: 'Czy masz orzeczenie o niepełnosprawności?', opts: [['nie', 'Nie'], ['tak', 'Tak']] },
  { name: 'opiekun', q: 'Czy opiekujesz się osobą z niepełnosprawnością?', opts: [['nie', 'Nie'], ['tak', 'Tak']] },
  { name: 'srodki', q: 'Czy w przeszłości przyznano Ci bezzwrotne środki publiczne na założenie firmy?', opts: [['nie', 'Nie'], ['tak', 'Tak'], ['niewiem', 'Nie wiem']] },
  { name: 'miejsce', q: 'Gdzie chcesz prowadzić firmę?', opts: [['wies', 'Na wsi albo w mniejszej miejscowości'], ['miasto', 'W dużym mieście'], ['niewiem', 'Jeszcze nie wiem']] }
];
function ocenaHtml() {
  const fs = pytania.map((p, i) => `<fieldset class="quiz__q" id="q-${p.name}">
      <legend><span class="quiz__n">${i + 1} z ${pytania.length}</span>${esc(p.q)}</legend>
      <div class="quiz__opts">${p.opts.map(([v, l]) => `<label class="choice"><input type="radio" name="${p.name}" value="${v}"><span class="choice__body">${esc(l)}</span></label>`).join('')}</div>
    </fieldset>`).join('');
  const kwoty = Object.fromEntries(limity.map(l => [l.id, zl(l.x * wyn.kwota)]));
  Object.assign(kwoty, Object.fromEntries(limity.map(l => ['n_' + l.id, Math.floor(l.x * wyn.kwota)])));
  kwoty.umorzenie = zl(6 * wyn.kwota);
  return `<form class="quiz" id="ocena" novalidate data-kwoty="${esc(JSON.stringify(kwoty))}">
    ${fs}
    <p class="quiz__error" id="ocena-error" role="alert" hidden></p>
    <p class="quiz__actions"><button class="btn btn--primary btn--large" type="submit">Pokaż wynik</button></p>
    <p class="small">Odpowiedzi zostają w Twojej przeglądarce. Nic nie wysyłamy, dopóki nie wypełnisz formularza.</p>
  </form>
  <section class="quiz__result" id="ocena-wynik" tabindex="-1" hidden aria-labelledby="ocena-wynik-h">
    <h2 id="ocena-wynik-h">Twój wstępny wynik</h2>
    <p class="quiz__summary" id="ocena-suma"></p>
    <ul class="quiz__list" id="ocena-lista"></ul>
    <p class="quiz__disclaimer">To wstępna ocena na podstawie ogólnych warunków programów. Ostateczne zasady określa regulamin konkretnego urzędu, LGD albo pośrednika, dlatego przed zamówieniem sprawdzamy je w Twoim przypadku.</p>
    ${(() => { const s = uslugi.find(u => u.id === 'pup'); return s && s.successFee ? `<p class="quiz__price" id="ocena-cena" hidden>Biznesplan i wniosek przygotujemy za ${pln(s.cena + s.successFee)}. ${pln(s.cena)} płacisz na start, a ${pln(s.successFee)} dopiero po przyznaniu środków. Jeśli wniosek nie przejdzie, drugiej części nie płacisz. Dokumenty dostajesz w ciągu 7 dni od wypełnienia formularza.</p>` : ''; })()}
    <p class="hero__actions"><a class="btn btn--primary btn--large" id="ocena-cta" href="/kontakt/">Poproś o bezpłatną ocenę</a>${site.messenger ? `<a class="btn btn--ghost btn--large" href="${esc(site.messenger)}" rel="noopener">Napisz na Messengerze</a>` : ''}</p>
  </section>
  <noscript><p class="note">Ocena działa w przeglądarce z włączonym JavaScriptem. Możesz od razu wypełnić <a href="/kontakt/">formularz kwalifikacyjny</a>, a ocenimy Twoją sytuację e-mailem.</p></noscript>`;
}

// Bloki ::: w treściach Markdown
function renderBody(md) {
  const parts = [];
  const re = /^::: *(\w+)([^\n]*)\n([\s\S]*?)\n?:::\s*$/gm;
  let last = 0, m;
  while ((m = re.exec(md))) {
    if (m.index > last) parts.push(renderPlain(md.slice(last, m.index)));
    parts.push(renderBlock(m[1], m[2].trim(), m[3]));
    last = re.lastIndex;
  }
  if (last < md.length) parts.push(renderPlain(md.slice(last)));
  return parts.join('\n');
}
function renderPlain(md) {
  return md.trim() ? `<section class="section"><div class="wrap prose">${md2html(md)}</div></section>` : '';
}
function sectionHead(md) {
  return md.trim() ? `<div class="section__head prose">${md2html(md)}</div>` : '';
}
function renderBlock(type, extra, md) {
  const cond = (extra.match(/if=([\w-]+)/) || [])[1];
  if (cond === 'platnosci' && !payments) return '';
  if (cond === 'bez-platnosci' && payments) return '';
  const cls = extra ? ' ' + extra.split(/\s+/).filter(x => !x.includes('=')).map(x => `section--${x}`).join(' ') : '';
  if (type === 'stats') return `<section class="section section--stats"><div class="wrap">${sectionHead(md)}${statsHtml()}</div></section>`;
  if (type === 'programs') {
    const ids = (extra.match(/ids=([\w,-]+)/) || [])[1];
    const compact = /\bcompact\b/.test(extra);
    return `<section class="section section--programs" id="programy"><div class="wrap">${sectionHead(md)}${programsHtml(ids, compact)}${compact ? `<p class="small sources-note">Dane sprawdzone: ${esc(sprawdzono)}, według stron instytucji publicznych. Źródła podajemy przy <a href="/finansowanie-na-start/#programy">pełnym opisie programów</a>.</p>` : sourcesHtml()}</div></section>`;
  }
  if (type === 'kalkulator') return `<section class="section section--tool"><div class="wrap">${sectionHead(md)}${kalkulatorHtml()}</div></section>`;
  if (type === 'ocena') return `<section class="section section--tool"><div class="wrap narrow">${sectionHead(md)}${ocenaHtml()}</div></section>`;
  if (type === 'opinie') return opinie.length ? `<section class="section section--reviews" id="opinie"><div class="wrap">${sectionHead(md)}${opinieHtml()}</div></section>` : '';
  if (type === 'services') {
    const ids = (extra.match(/ids=([\w,-]+)/) || [])[1];
    const list = ids ? ids.split(',').map(id => uslugi.find(u => u.id === id)).filter(Boolean) : uslugi;
    return `<section class="section section--services"><div class="wrap">${sectionHead(md)}<div class="services${list.length === 1 ? ' services--single' : ''}">${list.map(serviceCard).join('')}</div></div></section>`;
  }
  if (type === 'cards') {
    const [intro, ...items] = md.split(/^### /m);
    const cards = items.map(item => {
      const [title, ...rest] = item.trim().split('\n');
      let link = '';
      const lm = (rest[rest.length - 1] || '').trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) { rest.pop(); link = `<a class="card__link" href="${lm[2]}">${lm[1]}${arrow}</a>`; }
      return `<article class="card"><h3>${title.trim()}</h3>${md2html(rest.join('\n'))}${link}</article>`;
    }).join('');
    const cols = items.length % 3 === 0 ? 3 : items.length === 4 ? 4 : 2;
    return `<section class="section${cls}"><div class="wrap">${sectionHead(intro)}<div class="cards cards--${cols}">${cards}</div></div></section>`;
  }
  let html = md2html(md);
  html = html.replace(/<p><a href="([^"]+)">([^<]+)<\/a><\/p>\s*$/, `<p class="more"><a class="textlink" href="$1">$2${arrow}</a></p>`);
  if (extra.split(/\s+/).includes('split')) {
    // Głowa to nagłówek i akapit pod nim, a gdy akapitu nie ma, sam nagłówek
    const h2end = html.indexOf('</h2>') + 5;
    const end = /^\s*<p>/.test(html.slice(h2end)) ? html.indexOf('</p>', h2end) + 4 : h2end;
    return `<section class="section${cls}"><div class="wrap split"><div class="split__head">${html.slice(0, end)}</div><div class="split__body">${html.slice(end)}</div></div></section>`;
  }
  if (extra.split(/\s+/).includes('note')) return `<section class="section${cls}"><div class="wrap"><div class="note prose">${html}</div></div></section>`;
  return `<section class="section${cls}"><div class="wrap prose">${html}</div></section>`;
}

function renderFaq(md) {
  const qa = md.split(/^### /m).filter(s => s.trim()).map(item => {
    const [q, ...rest] = item.split('\n');
    return { q: q.trim(), a: md2html(rest.join('\n')) };
  });
  const html = qa.map(({ q, a }) => `<details class="faq__item"><summary>${q}</summary><div class="faq__answer">${a}</div></details>`).join('');
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '').trim() } }))
  };
  return { html: `<section class="section"><div class="wrap narrow faq">${html}</div></section>`, ld };
}

// Zasoby z sumą kontrolną w nazwie (długi cache)
const assetDir = join(root, 'assets');
const cssSrc = readFileSync(join(assetDir, 'css', 'style.css'), 'utf8');
const jsSrc = readFileSync(join(assetDir, 'js', 'site.js'), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 8);
const cssName = `assets/style.${hash(cssSrc)}.css`;
const jsName = `assets/site.${hash(jsSrc)}.js`;

const logo = (cls = '') => `<span class="brand__mark${cls}" aria-hidden="true"><img src="/assets/logo-znak.svg" alt="" width="40" height="40"></span><span class="brand__name" translate="no">Kapitałownia</span>`;

function layout(page, bodyHtml, extraHead = '') {
  const { path } = page;
  const canonical = site.url + (path === '/404.html' ? '/' : path);
  const robots = mode === 'preview' || page.noindex ? '<meta name="robots" content="noindex, nofollow">' : '';
  const nav = site.nav.map(n => `<li><a href="${n.href}"${path.startsWith(n.href) ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('');
  const hero = page.hero || {};
  const isHome = page.layout === 'home';
  const heroHtml = isHome ? homeHeroHtml(hero) : `<section class="hero">
    <div class="wrap">
      <div class="hero__text">
        <h1>${esc(hero.title || page.title)}</h1>
        ${hero.lead ? `<p class="lead">${esc(hero.lead)}</p>` : ''}
        ${hero.cta ? `<p class="hero__actions"><a class="btn btn--primary btn--large" href="${hero.ctaHref || '/kontakt/'}">${esc(hero.cta)}</a>${hero.secondary ? `<a class="btn btn--ghost btn--large" href="${hero.secondaryHref}">${esc(hero.secondary)}</a>` : ''}</p>` : ''}
      </div>
    </div>
  </section>`;
  const ctaBand = ['contact', 'legal', 'shop'].includes(page.layout) || page.noindex ? '' : `<section class="cta-band">
    <div class="wrap cta-band__inner">
      <div>
        <h2>Sprawdźmy, jakie finansowanie pasuje do Ciebie</h2>
        <p>Opisz krótko swoją sytuację. Odpiszemy ze wstępną oceną, zanim cokolwiek zamówisz.</p>
      </div>
      <p class="cta-band__actions"><a class="btn btn--light btn--large" href="/kontakt/">Poproś o ocenę</a>${site.messenger ? `<a class="cta-band__link" href="${esc(site.messenger)}" rel="noopener">albo napisz na Messengerze</a>` : ''}</p>
    </div>
  </section>`;
  const crumbLd = !isHome && !page.noindex ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: site.url + '/' },
      ...(page.layout === 'article' ? [{ '@type': 'ListItem', position: 2, name: 'Poradniki', item: site.url + '/wiedza/' }] : []),
      { '@type': 'ListItem', position: page.layout === 'article' ? 3 : 2, name: hero.title || page.title, item: canonical }
    ]
  })}</script>` : '';
  // Strony usług: Service powiązany z organizacją ze strony głównej
  const serviceLd = page.service && !page.noindex ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Service', name: hero.title || page.title, serviceType: page.service,
    description: page.description, url: canonical, areaServed: { '@type': 'Country', name: 'Polska' },
    provider: { '@type': 'ProfessionalService', '@id': site.url + '/#organizacja', name: site.name, url: site.url + '/' }
  })}</script>` : '';
  const orgLd = isHome ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': ['ProfessionalService', 'Organization'], '@id': site.url + '/#organizacja',
    name: site.name, url: site.url + '/', logo: site.url + '/assets/apple-touch-icon.png', image: site.url + '/assets/og.png',
    email: site.email, ...(firma.nip ? { taxID: firma.nip } : {}),
    areaServed: { '@type': 'Country', name: 'Polska' },
    description: page.description,
    knowsAbout: ['dotacja z urzędu pracy', 'środki PFRON na działalność', 'pożyczka BGK Pierwszy biznes - Wsparcie w starcie', 'premia z Lokalnej Grupy Działania', 'biznesplan', 'wnioski grantowe dla NGO', 'dotacje dla OSP'],
    hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Usługi Kapitałowni', itemListElement: uslugi.map(u => ({
      '@type': 'Offer', itemOffered: { '@type': 'Service', name: u.nazwa, description: u.opis },
      ...(typeof u.cena === 'number' ? { price: u.cena, priceCurrency: 'PLN' } : {})
    })) },
    ...(site.facebook ? { sameAs: [site.facebook] } : {})
  })}</script>` : '';
  const verify = isHome && mode === 'production' ? Object.entries({ 'google-site-verification': site.weryfikacja?.google, 'msvalidate.01': site.weryfikacja?.bing })
    .filter(([, v]) => v).map(([k, v]) => `<meta name="${k}" content="${esc(v)}">`).join('\n') : '';
  const previewBar = mode === 'preview' ? '<div class="preview-bar" role="note">Wersja robocza do akceptacji. Formularz i płatności w podglądzie nie działają.</div>' : '';
  const fbIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.4V21z"/></svg>';

  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${robots}
${verify}
${page.noindex ? '' : `<link rel="canonical" href="${canonical}">`}
<meta property="og:type" content="website">
<meta property="og:locale" content="pl_PL">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${site.url}/assets/og.png">
<meta name="theme-color" content="#f7f6f3">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/newsreader-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${cssName}">
<noscript><link rel="stylesheet" href="/assets/noscript.css"></noscript>
${extraHead}
${orgLd}${crumbLd}${serviceLd}
</head>
<body class="page-${page.layout || 'default'}">
<a class="skip" href="#tresc">Przejdź do treści</a>
${previewBar}
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/" aria-label="Kapitałownia, strona główna">${logo()}</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="menu"><span class="nav-toggle__bar" aria-hidden="true"></span><span class="nav-toggle__label">Menu</span></button>
    <nav class="site-nav" id="menu" aria-label="Główne menu">
      <ul>${nav}</ul>
      <a class="btn btn--primary btn--small" href="/ocena-szans/"${path === '/ocena-szans/' ? ' aria-current="page"' : ''}>Bezpłatna ocena szans</a>
    </nav>
  </div>
</header>
<main id="tresc">
${heroHtml}
${bodyHtml}
${ctaBand}
</main>
<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div>
      <p class="brand brand--footer">${logo()}</p>
      <p class="site-footer__text">Dotacje, pożyczki i dokumentacja dla osób zakładających firmę, przedsiębiorców, rolników i organizacji. Działamy w całej Polsce.</p>
      <p><a href="mailto:${site.email}">${site.email}</a></p>
      ${site.facebook ? `<p><a class="social" href="${esc(site.facebook)}" rel="me noopener">${fbIcon}<span>Kapitałownia na Facebooku</span></a></p>` : ''}
      ${site.messenger ? `<p><a href="${esc(site.messenger)}" rel="noopener">Napisz na Messengerze</a></p>` : ''}
    </div>
    <nav aria-label="Stopka" class="site-footer__nav">
      <div>
        <p class="site-footer__head">Start firmy</p>
        <ul class="site-footer__links">
          <li><a href="/finansowanie-na-start/">Wszystkie programy na start</a></li>
          <li><a href="/dotacja-z-urzedu-pracy/">Dotacja z urzędu pracy</a></li>
          <li><a href="/wsparcie-w-starcie/">Pożyczka Wsparcie w starcie</a></li>
          <li><a href="/ocena-szans/">Ocena szans</a></li>
          <li><a href="/kalkulator-dotacji/">Kalkulator dotacji</a></li>
        </ul>
      </div>
      <div>
        <p class="site-footer__head">Firmy i organizacje</p>
        <ul class="site-footer__links">
          <li><a href="/rozwoj-firmy/">Rozwój firmy</a></li>
          <li><a href="/oferta/#rolnicy">Rolnicy</a></li>
          <li><a href="/fundacje-i-stowarzyszenia/">Fundacje i stowarzyszenia</a></li>
          <li><a href="/dotacje-dla-osp/">Dotacje dla OSP</a></li>
        </ul>
      </div>
      <div>
        <p class="site-footer__head">Współpraca</p>
        <ul class="site-footer__links">
          <li><a href="/zamow/">Cennik i zamówienie</a></li>
          <li><a href="/wspolpraca/">Jak pracujemy</a></li>
          <li><a href="/faq/">Częste pytania</a></li>
          <li><a href="/wiedza/">Poradniki</a></li>
          <li><a href="/kontakt/">Kontakt</a></li>
          <li><a href="/regulamin/">Regulamin</a></li>
          <li><a href="/polityka-prywatnosci/">Polityka prywatności</a></li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="wrap site-footer__bottom"><p>© ${new Date().getFullYear()} Kapitałownia${firmaFooter ? `, ${firmaFooter}` : ''}</p></div>
</footer>
<script src="/${jsName}" defer></script>
</body>
</html>
`;
  return rewriteLinks(html);
}

// Budowanie
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(join(out, 'assets', 'fonts'), { recursive: true });
writeFileSync(join(out, cssName), cssSrc);
writeFileSync(join(out, jsName), jsSrc);
cpSync(join(assetDir, 'img'), join(out, 'assets'), { recursive: true });
const fontDir = join(root, '..', 'node_modules', '@fontsource-variable');
for (const pkg of ['geist', 'newsreader']) {
  for (const sub of ['latin', 'latin-ext']) {
    const f = `${pkg}-${sub}-wght-normal.woff2`;
    cpSync(join(fontDir, pkg, 'files', f), join(out, 'assets', 'fonts', f));
  }
}

// Data ostatniej zmiany strony z historii gita: plik treści i dane, z których korzysta.
// Plik zmieniony, ale jeszcze niezapisany w gicie, dostaje dzisiejszą datę.
function lastmodOf(files) {
  try {
    const rel = files.map(f => join('site', f));
    const cwd = join(root, '..');
    if (execFileSync('git', ['status', '--porcelain', '--', ...rel], { cwd, encoding: 'utf8' }).trim()) return updated;
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...rel], { cwd, encoding: 'utf8' }).trim();
    return d || updated;
  } catch { return updated; }
}
const deps = body => [
  /::: *programs/.test(body) ? 'programy.json' : null,
  /::: *services|\{\{cena/.test(body) ? 'uslugi.json' : null,
  /::: *opinie/.test(body) ? 'opinie.json' : null,
  /::: *(kalkulator|ocena)/.test(body) ? 'wynagrodzenie.json' : null
].filter(Boolean);
let todos = 0;
// Artykuły z sekcji Wiedza: lista potrzebna do strony /wiedza/ i do powiązanych tekstów
const plDate = d => new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
const slugify = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const articles = readdirSync(join(root, 'content')).filter(f => f.endsWith('.md')).map(f => {
  const { data, content } = matter(readFileSync(join(root, 'content', f), 'utf8'));
  if (data.layout !== 'article') return null;
  const words = stripComments(content).replace(/[#*|>\[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return { ...data, words, minutes: Math.max(1, Math.round(words / 200)) };
}).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.hero.title.localeCompare(b.hero.title, 'pl'));
const articleCard = a => `<a class="acard" href="${a.path}">
    <span class="acard__meta">${a.minutes} min czytania</span>
    <span class="acard__title">${esc(a.hero.title)}</span>
    <span class="acard__desc">${esc(a.description)}</span>
    <span class="acard__more">Czytaj${arrow}</span>
  </a>`;
function articleHtml(page, body) {
  let html = md2html(body);
  const toc = [];
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, t) => {
    const id = slugify(t.replace(/<[^>]+>/g, ''));
    toc.push([id, t.replace(/<[^>]+>/g, '')]);
    return `<h2 id="${id}">${t}</h2>`;
  }).replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Tabela, przewiń w bok"><table class="prose-table">').replace(/<\/table>/g, '</table></div>');
  const me = articles.find(a => a.path === page.path) || { minutes: 1 };
  const related = articles.filter(a => a.path !== page.path).slice(0, 3);
  const tocHtml = toc.length > 2 ? `<nav class="toc" aria-label="Spis treści"><p class="toc__title">W tym artykule</p><ol>${toc.filter(([id]) => !/^(zrodla|jak-mozemy-pomoc)$/.test(id)).map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav>` : '';
  return `<section class="section"><div class="wrap article">
      <aside class="article__aside">${tocHtml}</aside>
      <div class="article__main">
        <p class="article__meta">Aktualizacja ${plDate(page.updated || page.date)} · ${me.minutes} min czytania · Kapitałownia</p>
        <div class="prose article__body">${html}</div>
      </div>
    </div></section>
    ${related.length ? `<section class="section section--white"><div class="wrap"><div class="section__head"><h2>Przeczytaj też</h2></div><div class="acards">${related.map(articleCard).join('')}</div></div></section>` : ''}`;
}
const pages = [];
for (const file of readdirSync(join(root, 'content')).filter(f => f.endsWith('.md'))) {
  const { data, content } = matter(readFileSync(join(root, 'content', file), 'utf8'));
  const page = { ...data, source: file };
  todos += (content.match(/<!--\s*TODO/g) || []).length;
  page.lastmod = lastmodOf([join('content', file), ...deps(content)]);
  const body = content
    .replaceAll('{{firma}}', firmaText)
    .replaceAll('{{email}}', site.email)
    .replaceAll('{{updated}}', updatedText);
  let html, extraHead = '';
  if (page.layout === 'faq') {
    const faq = renderFaq(body);
    html = faq.html;
    extraHead = `<script type="application/ld+json">${JSON.stringify(faq.ld)}</script>`;
  } else if (page.layout === 'contact') {
    const options = uslugi.map(u => [u.id, u.nazwa]);
    const ico = {
      mail: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zm2.2.5 6.8 5.2L18.8 7zM19 8.9l-6.4 4.9a1 1 0 0 1-1.2 0L5 8.9V17h14z"/>',
      fb: '<path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.4V21z"/>',
      faq: '<path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 10.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 6.8c1.9 0 3.3 1.2 3.3 2.9 0 1.3-.8 2-1.6 2.5-.6.4-.8.6-.8 1.1v.4h-2v-.5c0-1.2.6-1.8 1.4-2.3.6-.4 1-.7 1-1.2 0-.6-.6-1-1.3-1s-1.4.5-1.5 1.2l-2-.3c.3-1.7 1.7-2.8 3.5-2.8z"/>'
    };
    const contactRow = (href, icon, label, value, ext) => `<li><a class="contact-card" href="${href}"${ext ? ' rel="noopener"' : ''}>
      <span class="contact-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">${ico[icon]}</svg></span>
      <span class="contact-card__text"><span class="contact-card__label">${label}</span><span class="contact-card__value">${value}</span></span>
      <span class="contact-card__arrow" aria-hidden="true">→</span>
    </a></li>`;
    const contacts = `<aside class="form-aside form-aside--contact" aria-labelledby="kontakt-bezposredni">
      <h2 id="kontakt-bezposredni">Wolisz napisać bezpośrednio?</h2>
      <ul class="contact-cards">
        ${site.messenger ? contactRow(esc(site.messenger), 'fb', 'Messenger', 'Odpisujemy najszybciej', true) : ''}
        ${contactRow(`mailto:${site.email}`, 'mail', 'E-mail', esc(site.email))}
        ${site.facebook ? contactRow(esc(site.facebook), 'fb', 'Facebook', 'Profil Kapitałowni', true) : ''}
        ${contactRow('/faq/', 'faq', 'Masz pytania?', 'Zobacz FAQ')}
      </ul>
    </aside>`;
    html = `<section class="section section--form"><div class="wrap form-layout">${formHtml({ mode, uslugi: options, order: Boolean(page.order) })}<aside class="form-aside form-aside--steps">${md2html(body)}</aside>${contacts}</div></section>`;
  } else if (page.layout === 'article') {
    html = articleHtml(page, body);
    extraHead = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: page.hero.title, description: page.description,
      datePublished: String(page.date), dateModified: String(page.updated || page.date), inLanguage: 'pl',
      mainEntityOfPage: site.url + page.path, image: site.url + '/assets/og.png',
      author: { '@type': 'Organization', '@id': site.url + '/#organizacja', name: site.name, url: site.url + '/' },
      publisher: { '@type': 'Organization', name: site.name, logo: { '@type': 'ImageObject', url: site.url + '/assets/apple-touch-icon.png' } }
    })}</script>`;
  } else if (page.layout === 'wiedza') {
    html = `<section class="section"><div class="wrap">${sectionHead(body)}<div class="acards">${articles.map(articleCard).join('')}</div></div></section>`;
  } else if (page.layout === 'legal') {
    html = `<section class="section"><div class="wrap narrow prose prose--legal">${md2html(body)}</div></section>`;
  } else {
    html = renderBody(body);
  }
  pages.push(page);
  const target = join(out, fileFor(page.path));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, layout(page, html, extraHead));
}

// Pliki publiczne: .htaccess, obsługa formularza, robots, sitemap
if (!flat) cpSync(join(root, 'public'), out, { recursive: true });
if (mode === 'production') {
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nDisallow: /api/\n\nSitemap: ${site.url}/sitemap.xml\n`);
  const urls = pages.filter(p => !p.noindex).map(p => `  <url><loc>${site.url}${p.path}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
} else {
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  if (!flat) {
    writeFileSync(join(out, '.htaccess'), readFileSync(join(root, 'public', '.htaccess'), 'utf8') + '\n# Wersja robocza\nHeader always set X-Robots-Tag "noindex, nofollow"\n');
    rmSync(join(out, 'api'), { recursive: true, force: true });
  }
}
if (todos) console.log(`Uwaga, ${todos} komentarzy TODO w treściach czeka na weryfikację (nie trafiają na stronę).`);
console.log(`Zbudowano ${pages.length} stron (${mode}${flat ? ', flat' : ''}) w ${out}`);
