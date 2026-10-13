// Zgłasza do IndexNow (Bing, Yandex i inne) adresy, które zmieniły się w tym wdrożeniu.
// Porównuje nową mapę strony z mapą z kopii serwera sprzed wgrania.
// Użycie: node scripts/indexnow.cjs out/sitemap.xml kopia/sitemap.xml
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const [nowa, stara] = process.argv.slice(2);
const host = 'kapitalownia.pl';
const keyFile = readdirSync(join(__dirname, '..', 'site', 'public')).find(f => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.log('Brak pliku klucza IndexNow w site/public, pomijam.'); process.exit(0); }
const key = keyFile.slice(0, -4);

const parse = file => existsSync(file)
  ? new Map([...readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)].map(m => [m[1], m[2]]))
  : new Map();
const now = parse(nowa), before = parse(stara);
const urlList = [...now].filter(([u, d]) => before.get(u) !== d).map(([u]) => u);
if (!urlList.length) { console.log('Żadna strona nie zmieniła daty, nic nie zgłaszam.'); process.exit(0); }

console.log(`Zgłaszam ${urlList.length} adresów:\n${urlList.join('\n')}`);
fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList })
}).then(r => console.log(`IndexNow odpowiedział ${r.status} (200 i 202 oznaczają przyjęcie)`))
  .catch(e => console.log(`IndexNow niedostępny: ${e.message}`));
