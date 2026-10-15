// Builds the link preview (Slack, iMessage, social) for the Cinderblock page from its data:
// renders the 1200x630 image with headless Chrome and writes the stats into the page's
// description tags, so the preview text carries the numbers even where images don't load.
//
//   node scripts/og.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}; set CHROME to its executable.`);
  process.exit(2);
}

const data = (name) => JSON.parse(readFileSync(new URL(`../public/data/cinderblock/${name}`, import.meta.url), 'utf8'));
const totals = data('totals.json');
const year = totals.updated.slice(0, 4);
const buildsThisYear = data('builds_monthly.json')
  .filter((r) => r.month.startsWith(year))
  .reduce((sum, r) => sum + r.dev + r.rc + r.store + r.other, 0);
const mrsThisYear = data('mrs_monthly.json')
  .filter((r) => r.month.startsWith(year))
  .reduce((sum, r) => sum + r.merged_mrs + r.merged_prs, 0);

const int = (n) => n.toLocaleString('en-US');
const thousands = (n) => `${Math.round(n / 1000)}k`;

// The text Slack shows under the title.
const description =
  `${int(totals.merged_mrs + totals.merged_prs)} reviewed changes (${int(mrsThisYear)} in ${year}) · ` +
  `${int(totals.tags)} builds (${int(buildsThisYear)} in ${year}) · ` +
  `${int(totals.commits)} commits · ${thousands(totals.dart_lines)} lines of Dart · ` +
  `${totals.synced_domains} offline-synced domains. Latest: v${totals.current_version.replace(/\+.*/, '')}.`;


// Slack and other compact previews show only the centre square of the image as a small
// thumbnail, so the centre holds one number big enough to read at that size; the title and
// secondary figures sit around it for the full-width view.
const side = [
  [int(totals.merged_mrs + totals.merged_prs), 'reviewed changes', `${int(mrsThisYear)} in ${year}`],
  [int(totals.commits), 'commits', `since ${totals.first_commit.slice(0, 4)}`],
  [thousands(totals.dart_lines), 'lines of Dart', `${totals.synced_domains} offline-synced domains`],
];

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #0d1b2e; color: #e6eef8; font-family: 'IBM Plex Mono', monospace; position: relative;
    background-image: linear-gradient(rgba(150,190,240,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(150,190,240,.08) 1px, transparent 1px);
    background-size: 30px 30px; }
  .head { position: absolute; top: 40px; left: 0; right: 0; text-align: center; }
  .eyebrow { color: #f2a93b; font-size: 20px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase;
    display: inline-flex; align-items: center; gap: 12px; }
  .mark { width: 34px; height: 34px; }
  .title { font: 800 34px/1.1 'Archivo', sans-serif; margin-top: 8px; color: #c9d6e6; }
  .hero { position: absolute; left: 285px; width: 630px; top: 130px; height: 370px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; }
  .hero .v { font: 800 230px/0.9 'Archivo', sans-serif; letter-spacing: -.03em; }
  .hero .l { font: 800 64px/1 'Archivo', sans-serif; color: #f2a93b; margin-top: 6px; }
  .hero .s { font-size: 26px; color: #93a6bd; margin-top: 12px; letter-spacing: .04em; }
  .foot { position: absolute; bottom: 36px; left: 64px; right: 64px; display: grid; grid-template-columns: repeat(3, 1fr);
    border-top: 2px solid rgba(230,238,248,.5); padding-top: 16px; }
  .foot div { text-align: center; }
  .foot .v { font: 800 34px/1 'Archivo', sans-serif; }
  .foot .l { color: #93a6bd; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; margin-top: 6px; }
</style></head><body>
  <div class="head"><div class="eyebrow"><img class="mark" src="file://${fileURLToPath(new URL('../public/favicon.svg', import.meta.url))}">stats.upcode.dev · v${totals.current_version.replace(/\+.*/, '')}</div>
    <div class="title">Cinderblock Mobile in numbers</div></div>
  <div class="hero"><div class="v">${int(totals.tags)}</div><div class="l">builds</div>
    <div class="s">${int(buildsThisYear)} in ${year}</div></div>
  <div class="foot">${side.map(([v, l]) => `<div><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'og-'));
const card = join(dir, 'og.html');
writeFileSync(card, html);
const output = fileURLToPath(new URL('../public/cinderblock/og.png', import.meta.url));
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--virtual-time-budget=5000', `--screenshot=${output}`, `file://${card}`,
], { stdio: 'ignore' });
console.log('wrote public/cinderblock/og.png');

const imageHash = createHash('sha256').update(readFileSync(output)).digest('hex').slice(0, 10);
const pagePath = new URL('../cinderblock/index.html', import.meta.url);
const page = readFileSync(pagePath, 'utf8')
  .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
  // The image URL carries its content hash, so Slack fetches a changed image instead of
  // reusing its cached copy.
  .replace(/(<meta property="og:image" content="[^"?]*)(\?v=[^"]*)?(")/, `$1?v=${imageHash}$3`);
writeFileSync(pagePath, page);
console.log(`description: ${description}`);
