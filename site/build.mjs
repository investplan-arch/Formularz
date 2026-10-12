// Generator strony Kapitałowni.
// Użycie: node site/build.mjs [--mode=production|preview] [--flat] [--out=katalog]
//   production  wersja na kapitalownia.pl (indeksowana, formularz wysyła dane)
//   preview     wersja robocza (noindex, formularz nie wysyła danych)
//   --flat      linki do plików .html zamiast katalogów (podgląd bez serwera)
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
const site = JSON.parse(readFileSync(join(root, 'site.json'), 'utf8'));
const updated = new Date().toISOString().slice(0, 10);

const admin = site.administrator;
const adminFilled = admin.nazwa && admin.adres;
if (mode === 'production' && !adminFilled && !args.local) {
  console.error('Brak danych administratora w site/site.json (administrator.nazwa i administrator.adres). Polityka prywatności nie może zostać opublikowana bez nich.');
  process.exit(1);
}
const adminText = adminFilled
  ? [admin.nazwa, admin.adres, admin.nip && `NIP ${admin.nip}`, admin.regon_krs].filter(Boolean).join(', ')
  : '<mark>[dane administratora do uzupełnienia przed publikacją]</mark>';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Ścieżka docelowa i adres linku dla danej ścieżki strony
function fileFor(path) {
  if (path === '/') return flat && args.home ? String(args.home) : 'index.html';
  if (path.endsWith('.html')) return path.slice(1);
  return flat ? path.slice(1, -1) + '.html' : path.slice(1) + 'index.html';
}
// W trybie flat wszystkie strony leżą w katalogu głównym, więc linki są względne
function rewriteLinks(html) {
  if (!flat) return html;
  return html.replace(/href="\/([^"]*)"/g, (_, rest) => {
    if (rest.startsWith('assets/')) return `href="${rest}"`;
    const [p, hash] = ('/' + rest).split('#');
    return `href="${fileFor(p)}${hash ? '#' + hash : ''}"`;
  });
}

// Bloki ::: nazwa klasy ... :::
function renderBody(md) {
  const parts = [];
  const re = /^::: *(\w+)([^\n]*)\n([\s\S]*?)\n:::\s*$/gm;
  let last = 0, m;
  while ((m = re.exec(md))) {
    if (m.index > last) parts.push(renderPlain(md.slice(last, m.index)));
    parts.push(renderBlock(m[1], m[2].trim(), m[3]));
    last = re.lastIndex;
  }
  if (last < md.length) parts.push(renderPlain(md.slice(last)));
  return parts.join('\n');
}
function md2html(md) {
  return marked.parse(md)
    .replace(/<h([23])>(.*?) \{#([\w-]+)\}<\/h\1>/g, '<h$1 id="$3">$2</h$1>');
}
function renderPlain(md) {
  return md.trim() ? `<section class="section"><div class="wrap prose">${md2html(md)}</div></section>` : '';
}
function renderBlock(type, extra, md) {
  const cls = extra ? ` section--${extra}` : '';
  if (type === 'cards') {
    const items = md.split(/^### /m).filter(s => s.trim());
    const cards = items.map(item => {
      const [title, ...rest] = item.trim().split('\n');
      let link = '';
      const lastLine = rest[rest.length - 1] || '';
      const lm = lastLine.trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) { rest.pop(); link = `<a class="card__link" href="${lm[2]}">${lm[1]}<span aria-hidden="true"> →</span></a>`; }
      const body = md2html(rest.join('\n'));
      return `<article class="card"><h3>${title.trim()}</h3>${body}${link}</article>`;
    }).join('');
    return `<section class="section${cls}"><div class="wrap"><div class="cards cards--${items.length % 3 === 0 ? 3 : 2}">${cards}</div></div></section>`;
  }
  let html = md2html(md);
  // Ostatni samodzielny link w sekcji staje się przyciskiem tekstowym
  html = html.replace(/<p><a href="([^"]+)">([^<]+)<\/a><\/p>\s*$/, '<p class="more"><a class="textlink" href="$1">$2<span aria-hidden="true"> →</span></a></p>');
  if (extra === 'split') {
    const idx = html.indexOf('</p>');
    const head = html.slice(0, idx + 4), rest = html.slice(idx + 4);
    return `<section class="section${cls}"><div class="wrap split"><div class="split__head">${head}</div><div class="split__body">${rest}</div></div></section>`;
  }
  if (extra === 'note') return `<section class="section${cls}"><div class="wrap"><div class="note prose">${html}</div></div></section>`;
  return `<section class="section${cls}"><div class="wrap prose">${html}</div></section>`;
}

function renderFaq(md) {
  const items = md.split(/^### /m).filter(s => s.trim());
  const qa = items.map(item => {
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

// Wersjonowanie zasobów do długiego cache
const assetDir = join(root, 'assets');
const cssSrc = readFileSync(join(assetDir, 'css', 'style.css'), 'utf8');
const jsSrc = readFileSync(join(assetDir, 'js', 'site.js'), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 8);
const cssName = `assets/style.${hash(cssSrc)}.css`;
const jsName = `assets/site.${hash(jsSrc)}.js`;

function layout(page, bodyHtml, extraHead = '') {
  const { path } = page;
  const canonical = site.url + (path === '/404.html' ? '/' : path);
  const robots = mode === 'preview' || page.noindex ? '<meta name="robots" content="noindex, nofollow">' : '';
  const nav = site.nav.map(n => {
    const current = path.startsWith(n.href) ? ' aria-current="page"' : '';
    return `<li><a href="${n.href}"${current}>${n.label}</a></li>`;
  }).join('');
  const hero = page.hero || {};
  const isHome = page.layout === 'home';
  const heroAside = isHome ? `<aside class="hero__aside" aria-label="Najczęstsze tematy">
      <p class="hero__aside-title">Najczęściej pomagamy przy</p>
      <ul>
        <li>Środkach z urzędu pracy na start</li>
        <li>Naborach Lokalnych Grup Działania</li>
        <li>Środkach PFRON na działalność</li>
        <li>Pożyczkach preferencyjnych</li>
        <li>Biznesplanach</li>
        <li>Wnioskach grantowych dla NGO</li>
      </ul>
    </aside>` : '';
  const heroHtml = `<section class="hero${isHome ? ' hero--home' : ''}">
    <div class="wrap hero__grid">
      <div class="hero__text">
        ${hero.eyebrow ? `<p class="eyebrow">${esc(hero.eyebrow)}</p>` : ''}
        <h1>${esc(hero.title || page.title)}</h1>
        ${hero.lead ? `<p class="lead">${esc(hero.lead)}</p>` : ''}
        ${hero.cta ? `<p class="hero__actions"><a class="btn btn--primary" href="/kontakt/">${esc(hero.cta)}</a>${hero.secondary ? `<a class="btn btn--ghost" href="${hero.secondaryHref}">${esc(hero.secondary)}</a>` : ''}</p>` : ''}
      </div>
      ${heroAside}
    </div>
  </section>`;
  const ctaBand = ['contact', 'legal'].includes(page.layout) || page.noindex ? '' : `<section class="cta-band">
    <div class="wrap cta-band__inner">
      <div>
        <h2>Sprawdźmy, jakie finansowanie pasuje do Ciebie</h2>
        <p>Odpowiedz na kilka pytań. Wrócimy ze wstępną oceną na podany adres e-mail.</p>
      </div>
      <a class="btn btn--light" href="/kontakt/">Przejdź do formularza</a>
    </div>
  </section>`;
  const fb = site.facebook ? `<li><a href="${esc(site.facebook)}" rel="me noopener">Facebook</a></li>` : '';
  const orgLd = isHome ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ProfessionalService', name: site.name, url: site.url + '/',
    email: site.email, areaServed: { '@type': 'Country', name: 'Polska' },
    description: page.description, ...(site.facebook ? { sameAs: [site.facebook] } : {})
  })}</script>` : '';
  const previewBar = mode === 'preview' ? '<div class="preview-bar" role="note">Wersja robocza do akceptacji. Formularz w podglądzie nie wysyła danych.</div>' : '';

  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
<meta name="theme-color" content="#14213a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/source-serif-4-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${cssName}">
${extraHead}
${orgLd}
</head>
<body class="page-${page.layout || 'default'}">
<a class="skip" href="#tresc">Przejdź do treści</a>
${previewBar}
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/" aria-label="Kapitałownia, strona główna"><span class="brand__mark" aria-hidden="true">K</span><span class="brand__name">Kapitałownia</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="menu"><span class="nav-toggle__bar" aria-hidden="true"></span><span class="nav-toggle__label">Menu</span></button>
    <nav class="site-nav" id="menu" aria-label="Główne menu">
      <ul>${nav}</ul>
      <a class="btn btn--primary btn--small" href="/kontakt/"${path === '/kontakt/' ? ' aria-current="page"' : ''}>Kontakt</a>
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
      <p class="brand brand--footer"><span class="brand__mark" aria-hidden="true">K</span><span class="brand__name">Kapitałownia</span></p>
      <p class="site-footer__text">Dotacje, pożyczki i dokumentacja dla firm, rolników i organizacji. Działamy w całej Polsce.</p>
      <p><a href="mailto:${site.email}">${site.email}</a></p>
    </div>
    <nav aria-label="Stopka">
      <ul class="site-footer__links">
        <li><a href="/oferta/">Oferta</a></li>
        <li><a href="/finansowanie-na-start/">Finansowanie na start</a></li>
        <li><a href="/rozwoj-firmy/">Rozwój firmy</a></li>
        <li><a href="/fundacje-i-stowarzyszenia/">Fundacje i stowarzyszenia</a></li>
        <li><a href="/wspolpraca/">Współpraca</a></li>
        <li><a href="/faq/">Częste pytania</a></li>
        <li><a href="/kontakt/">Kontakt</a></li>
        <li><a href="/polityka-prywatnosci/">Polityka prywatności</a></li>
        ${fb}
      </ul>
    </nav>
  </div>
  <div class="wrap site-footer__bottom"><p>© ${new Date().getFullYear()} Kapitałownia</p></div>
</footer>
<script src="/${jsName}" defer></script>
</body>
</html>
`;
  return rewriteLinks(flat ? html.replace(/src="\/assets\//g, 'src="assets/') : html);
}

// Budowanie
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(join(out, 'assets', 'fonts'), { recursive: true });
writeFileSync(join(out, cssName), cssSrc);
writeFileSync(join(out, jsName), jsSrc);
cpSync(join(assetDir, 'img'), join(out, 'assets'), { recursive: true });
const fontDir = join(root, '..', 'node_modules', '@fontsource-variable');
for (const [pkg, base] of [['inter', 'inter'], ['source-serif-4', 'source-serif-4']]) {
  for (const sub of ['latin', 'latin-ext']) {
    const f = `${base}-${sub}-wght-normal.woff2`;
    cpSync(join(fontDir, pkg, 'files', f), join(out, 'assets', 'fonts', f));
  }
}

const pages = [];
for (const file of readdirSync(join(root, 'content')).filter(f => f.endsWith('.md'))) {
  const { data, content } = matter(readFileSync(join(root, 'content', file), 'utf8'));
  const page = { ...data, source: file };
  let body = content
    .replaceAll('{{admin}}', adminText)
    .replaceAll('{{email}}', site.email)
    .replaceAll('{{updated}}', updated);
  let html, extraHead = '';
  if (page.layout === 'faq') {
    const faq = renderFaq(body);
    html = faq.html;
    extraHead = `<script type="application/ld+json">${JSON.stringify(faq.ld)}</script>`;
  } else if (page.layout === 'contact') {
    html = `<section class="section section--form"><div class="wrap form-layout">${formHtml({ mode })}<aside class="form-aside">${md2html(body)}<h2>Co dalej</h2><ol class="mini-steps"><li>Czytamy zgłoszenie i sprawdzamy dostępne programy.</li><li>Odpisujemy e-mailem ze wstępną oceną.</li><li>Jeśli widzimy możliwość współpracy, proponujemy zakres i wycenę.</li></ol><p class="small">Nie prosimy o telefon ani dokumenty na tym etapie.</p></div></aside></div></section>`;
    html = html.replace('</div></aside>', '</aside>');
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
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nDisallow: /api/\nDisallow: /dziekujemy/\n\nSitemap: ${site.url}/sitemap.xml\n`);
  const urls = pages.filter(p => !p.noindex).map(p => `  <url><loc>${site.url}${p.path}</loc><lastmod>${updated}</lastmod></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
} else {
  writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  if (!flat) {
    // Wersja robocza na serwerze: nagłówek noindex i brak wysyłki
    writeFileSync(join(out, '.htaccess'), readFileSync(join(root, 'public', '.htaccess'), 'utf8') + '\n# Wersja robocza\nHeader always set X-Robots-Tag "noindex, nofollow"\n');
    rmSync(join(out, 'api'), { recursive: true, force: true });
  }
}
console.log(`Zbudowano ${pages.length} stron (${mode}${flat ? ', flat' : ''}) w ${out}`);
