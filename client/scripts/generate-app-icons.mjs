/**
 * Renders the native apps' icon and splash sources into assets/, from the
 * YOUYA mark in assets/source/youya-mark.svg. `npx @capacitor/assets generate
 * --android --ios` then turns them into every size both platforms ask for
 * (see the icons:app script).
 *
 * The look: a warm cream tile (奶油白 #FFF5E9) with a soft light from the top
 * left under the orange-and-mint mark, matching the PWA icon and the login
 * screen. Splashes stay on the launch background (#09090b), where the coloured
 * mark reads the way it does on the login backdrop.
 *
 * Android's adaptive icon masks the foreground to a circle inside the
 * canvas, so the mark there sits smaller than on the iOS tile.
 */
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const clientDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(clientDir, 'assets');
mkdirSync(outDir, { recursive: true });

const markSvg = readFileSync(join(clientDir, 'assets', 'source', 'youya-mark.svg'), 'utf8');
const markPaths = [...markSvg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]);
if (markPaths.length === 0) throw new Error('No mark paths found in youya-mark.svg');
// The mark's extent inside its 1500 x 1500 viewBox.
const MARK = { x: 112, y: 16, w: 1276, h: 1350 };

const LAUNCH_BG = '#09090b';
const ICON_BG = '#FFF5E9';

function tile(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFAF2"/>
      <stop offset="0.55" stop-color="${ICON_BG}"/>
      <stop offset="1" stop-color="#FFE7D2"/>
    </linearGradient>
    <radialGradient id="light" cx="0.22" cy="0.12" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.48" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#base)"/>
  <rect width="1024" height="1024" fill="url(#light)"/>
  <rect width="1024" height="1024" fill="url(#sheen)"/>
</svg>`;
}

/** The colour mark, `share` of the canvas tall, centred, with a soft shadow for depth. */
function mark(size, share, shadow = true) {
  const scale = (1024 * share) / MARK.h;
  const x = (1024 - MARK.w * scale) / 2;
  const y = (1024 - MARK.h * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#7a3f17" flood-opacity="0.28"/>
    </filter>
  </defs>
  <g ${shadow ? 'filter="url(#lift)"' : ''} transform="translate(${x} ${y}) scale(${scale}) translate(${-MARK.x} ${-MARK.y})">
    ${markPaths.join('\n    ')}
  </g>
</svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, file));
}

async function composite(background, overlay, file, size) {
  const base = await sharp(Buffer.from(background)).resize(size, size).png().toBuffer();
  const top = await sharp(Buffer.from(overlay)).resize(size, size).png().toBuffer();
  await sharp(base)
    .composite([{ input: top }])
    .flatten({ background: LAUNCH_BG })
    .png()
    .toFile(join(outDir, file));
}

// iOS and store listings: one opaque tile, the mark at about half its height.
await composite(tile(1024), mark(1024, 0.5), 'icon-only.png', 1024);
// Android adaptive icon: the two layers apart, the mark inside the safe circle.
await render(tile(1024), 'icon-background.png');
await render(mark(1024, 0.58), 'icon-foreground.png');
// Splash: the launch background with the mark, light and dark alike.
const splashBg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="${LAUNCH_BG}"/></svg>`;
await composite(splashBg, mark(2732, 0.2, false), 'splash.png', 2732);
await composite(splashBg, mark(2732, 0.2, false), 'splash-dark.png', 2732);

console.log(`[app-icons] wrote icon and splash sources to ${outDir}`);
