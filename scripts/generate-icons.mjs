// Renders the Klivr app icons from public/productivity-app.svg.
// Run with: npm run icons
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BG = '#1a1a1a';
const source = await readFile(new URL('../public/productivity-app.svg', import.meta.url), 'utf8');
const mark = source.match(/<path[\s\S]*?\/>/)[0];

/** The mark on a full-bleed square, scaled to `scale` of the canvas (1 = as drawn). */
function squareSvg({ rounded, scale = 1 }) {
  const offset = (512 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="80"' : ''} fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${mark}</g>
</svg>`;
}

const out = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
await mkdir(out('public/icons'), { recursive: true });

await writeFile(out('app/icon.svg'), squareSvg({ rounded: true }) + '\n');
const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(out(file));
await png(squareSvg({ rounded: true }), 192, 'public/icons/icon-192.png');
await png(squareSvg({ rounded: true }), 512, 'public/icons/icon-512.png');
// Maskable: full-bleed background, mark inside the 80% safe zone.
await png(squareSvg({ rounded: false, scale: 0.75 }), 512, 'public/icons/icon-maskable-512.png');
// Badge for Android's status bar: white mark on transparent.
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${mark.replace(/fill:#ececec/, 'fill:#ffffff')}</svg>`))
  .resize(96, 96).png().toFile(out('public/icons/badge-96.png'));
// iOS rounds the corners itself, so the apple icon is a plain square.
await png(squareSvg({ rounded: false, scale: 0.85 }), 180, 'app/apple-icon.png');
console.log('Icons written.');
