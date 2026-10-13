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

function md2html(md) {
  return marked.parse(md).replace(/<h([23])>(.*?) \{#([\w-]+)\}<\/h\1>/g, '<h$1 id="$3">$2</h$1>');
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
    <p class="review__stars" role="img" aria-label="Ocena ${o.ocena} na 5">${star.repeat(o.ocena)}</p>
    <blockquote class="review__text"><p>${esc(o.tekst)}</p></blockquote>
    <figcaption class="review__author"><span class="review__avatar review__avatar--${i % 4}" aria-hidden="true">${esc(o.autor.charAt(0))}</span><span>${esc(o.autor)}</span></figcaption>
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
  </article>`;
}
function programCompact(g) {
  return `<a class="pcompact" href="/finansowanie-na-start/#program-${g.id}">
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
  const price = priced
    ? `<div class="service__price"><p><strong>${pln(u.cena)}</strong> <span>na start, płatne przy zamówieniu</span></p>${fee ? `<p class="service__fee">+ ${pln(fee)} po przyznaniu środków</p><p class="service__total">Łącznie ${pln(u.cena + fee)}, jeśli otrzymasz finansowanie. Jeśli nie, płacisz tylko ${pln(u.cena)}.</p>` : ''}</div>`
    : '<p class="service__price service__price--quote">Wycena indywidualna</p>';
  const cta = buy
    ? `<a class="btn btn--primary" href="${esc(u.stripe)}" rel="noopener">Zamawiam i płacę</a>`
    : `<a class="btn btn--primary" href="/kontakt/?usluga=${u.id}">Poproś o wycenę</a>`;
  return `<article class="service" id="usluga-${u.id}">
    <h3>${esc(u.nazwa)}</h3>
    <p>${esc(u.opis)}</p>
    <ul class="checklist">${u.zakres.map(z => `<li>${esc(z)}</li>`).join('')}</ul>
    <div class="service__foot">${price}${cta}</div>
  </article>`;
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
    const ids = (extra.match(/ids=([\w,]+)/) || [])[1];
    const compact = /\bcompact\b/.test(extra);
    return `<section class="section section--programs" id="programy"><div class="wrap">${sectionHead(md)}${programsHtml(ids, compact)}${compact ? `<p class="small sources-note">Dane sprawdzone: ${esc(sprawdzono)}, według stron instytucji publicznych. Źródła podajemy przy <a href="/finansowanie-na-start/#programy">pełnym opisie programów</a>.</p>` : sourcesHtml()}</div></section>`;
  }
  if (type === 'opinie') return opinie.length ? `<section class="section section--reviews" id="opinie"><div class="wrap">${sectionHead(md)}${opinieHtml()}</div></section>` : '';
  if (type === 'services') return `<section class="section section--services"><div class="wrap">${sectionHead(md)}<div class="services">${uslugi.map(serviceCard).join('')}</div></div></section>`;
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
    const idx = html.indexOf('</p>');
    return `<section class="section${cls}"><div class="wrap split"><div class="split__head">${html.slice(0, idx + 4)}</div><div class="split__body">${html.slice(idx + 4)}</div></div></section>`;
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
  const heroHtml = `<section class="hero${isHome ? ' hero--home' : ''}">
    <div class="wrap">
      <div class="hero__text">
        <h1>${esc(hero.title || page.title)}</h1>
        ${hero.lead ? `<p class="lead">${esc(hero.lead)}</p>` : ''}
        ${hero.cta ? `<p class="hero__actions"><a class="btn btn--primary btn--large" href="${hero.ctaHref || '/kontakt/'}">${esc(hero.cta)}</a>${hero.secondary ? `<a class="btn btn--ghost btn--large" href="${hero.secondaryHref}">${esc(hero.secondary)}</a>` : ''}</p>` : ''}
      </div>
      ${isHome ? statsHtml('hero') : ''}
    </div>
  </section>`;
  const ctaBand = ['contact', 'legal', 'shop'].includes(page.layout) || page.noindex ? '' : `<section class="cta-band">
    <div class="wrap cta-band__inner">
      <div>
        <h2>Sprawdźmy, jakie finansowanie pasuje do Ciebie</h2>
        <p>Odpowiedz na kilka pytań. Odpiszemy ze wstępną oceną na podany adres e-mail.</p>
      </div>
      <a class="btn btn--light btn--large" href="/kontakt/">Sprawdź kwalifikację</a>
    </div>
  </section>`;
  const crumbLd = !isHome && !page.noindex ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: site.url + '/' },
      { '@type': 'ListItem', position: 2, name: hero.title || page.title, item: canonical }
    ]
  })}</script>` : '';
  const orgLd = isHome ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ProfessionalService', name: site.name, url: site.url + '/',
    logo: site.url + '/assets/apple-touch-icon.png', email: site.email, areaServed: { '@type': 'Country', name: 'Polska' },
    description: page.description, ...(site.facebook ? { sameAs: [site.facebook] } : {})
  })}</script>` : '';
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
${orgLd}${crumbLd}
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
      <a class="btn btn--primary btn--small" href="/kontakt/"${path === '/kontakt/' ? ' aria-current="page"' : ''}>Sprawdź kwalifikację</a>
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
    </div>
    <nav aria-label="Stopka">
      <ul class="site-footer__links">
        <li><a href="/oferta/">Oferta</a></li>
        <li><a href="/finansowanie-na-start/">Finansowanie na start</a></li>
        <li><a href="/rozwoj-firmy/">Rozwój firmy</a></li>
        <li><a href="/fundacje-i-stowarzyszenia/">Fundacje i stowarzyszenia</a></li>
        <li><a href="/zamow/">Cennik i zamówienie</a></li>
        <li><a href="/wspolpraca/">Jak pracujemy</a></li>
        <li><a href="/faq/">Częste pytania</a></li>
        <li><a href="/kontakt/">Kontakt</a></li>
        <li><a href="/regulamin/">Regulamin</a></li>
        <li><a href="/polityka-prywatnosci/">Polityka prywatności</a></li>
      </ul>
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

const pages = [];
for (const file of readdirSync(join(root, 'content')).filter(f => f.endsWith('.md'))) {
  const { data, content } = matter(readFileSync(join(root, 'content', file), 'utf8'));
  const page = { ...data, source: file };
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
        ${contactRow(`mailto:${site.email}`, 'mail', 'E-mail', esc(site.email))}
        ${site.facebook ? contactRow(esc(site.facebook), 'fb', 'Facebook', 'Profil Kapitałowni', true) : ''}
        ${contactRow('/faq/', 'faq', 'Masz pytania?', 'Zobacz FAQ')}
      </ul>
    </aside>`;
    html = `<section class="section section--form"><div class="wrap form-layout">${formHtml({ mode, uslugi: options, order: Boolean(page.order) })}<aside class="form-aside form-aside--steps">${md2html(body)}</aside>${contacts}</div></section>`;
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
  const urls = pages.filter(p => !p.noindex).map(p => `  <url><loc>${site.url}${p.path}</loc><lastmod>${updated}</lastmod></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
} else {
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  if (!flat) {
    writeFileSync(join(out, '.htaccess'), readFileSync(join(root, 'public', '.htaccess'), 'utf8') + '\n# Wersja robocza\nHeader always set X-Robots-Tag "noindex, nofollow"\n');
    rmSync(join(out, 'api'), { recursive: true, force: true });
  }
}
console.log(`Zbudowano ${pages.length} stron (${mode}${flat ? ', flat' : ''}) w ${out}`);
