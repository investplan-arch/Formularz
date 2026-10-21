// Render rolki START: node render-start.mjs out/start.mp4
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const wyjscie = process.argv[2] ?? 'out/start.mp4';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Start' });
await renderMedia({
  composition, serveUrl, codec: 'h264', crf: 18, audioCodec: 'aac', outputLocation: wyjscie,
  onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)}%   `),
});
console.log(`\nGotowe: ${wyjscie}`);
