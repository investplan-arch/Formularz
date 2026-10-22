// Użycie: node render-karuzele.mjs [karuzele/nazwa.json ...]
// Bez argumentów renderuje wszystkie karuzele z katalogu karuzele/ oraz zdjęcie profilowe
// i okładki wyróżnionych relacji. Wynik: out/karuzele/<nazwa>/NN.png, out/profil/*.png
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const pliki = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('karuzele').filter((f) => f.endsWith('.json')).map((f) => path.join('karuzele', f));

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });

const still = async (id, inputProps, output) => {
  const composition = await selectComposition({ serveUrl, id, inputProps });
  await renderStill({ composition, serveUrl, inputProps, output, imageFormat: 'png' });
};

for (const plik of pliki) {
  const { zrodlo, slajdy } = JSON.parse(readFileSync(plik, 'utf8'));
  const dir = path.join('out/karuzele', path.basename(plik, '.json'));
  mkdirSync(dir, { recursive: true });
  for (const [i, slajd] of slajdy.entries()) {
    await still('Slajd', { slajd, nr: i + 1, razem: slajdy.length, zrodlo }, path.join(dir, `${String(i + 1).padStart(2, '0')}.png`));
  }
  console.log(`Gotowe: ${dir} (${slajdy.length} slajdów)`);
}

if (!process.argv.slice(2).length) {
  mkdirSync('out/profil', { recursive: true });
  await still('Okladka', {}, 'out/profil/zdjecie-profilowe.png');
  const wyroznione = JSON.parse(readFileSync('profil.json', 'utf8'));
  for (const w of wyroznione) await still('Okladka', { tekst: w.tekst }, `out/profil/wyr-${w.plik}.png`);
  console.log('Gotowe: out/profil');
}
