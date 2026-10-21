// Użycie: node render.mjs scenariusze/lista.json out/lista.mp4
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [scenariusz, wyjscie] = process.argv.slice(2);
if (!scenariusz || !wyjscie) {
  console.error('Użycie: node render.mjs <scenariusz.json> <plik.mp4>');
  process.exit(1);
}
const inputProps = JSON.parse(readFileSync(scenariusz, 'utf8'));
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Rolka', inputProps });
await renderMedia({
  composition, serveUrl, inputProps, codec: 'h264', crf: 18,
  outputLocation: wyjscie,
  onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%`),
});
console.log(`\nGotowe: ${wyjscie}`);
