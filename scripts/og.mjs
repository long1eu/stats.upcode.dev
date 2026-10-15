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

// Inlined: headless Chrome will not load a CSS mask from a file:// URL.
const monogram = `data:image/svg+xml;base64,${readFileSync(new URL('../public/favicon.svg', import.meta.url)).toString('base64')}`;
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@600;800&family=JetBrains+Mono:wght@500&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #0a0f14; color: #f2f6f8; font-family: 'Inter', sans-serif; position: relative; -webkit-font-smoothing: antialiased; }
  .glow { position: absolute; width: 900px; height: 900px; left: 150px; top: -120px; filter: blur(60px);
    background: radial-gradient(circle, rgba(31,209,174,.32) 0%, rgba(31,209,174,.08) 45%, transparent 68%); }
  .bar { position: absolute; top: 40px; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 14px; }
  .tile { width: 44px; height: 44px; border-radius: 11px; background: #1fd1ae; display: grid; place-items: center; }
  .tile::after { content: ''; width: 37px; height: 37px; background: #06231e; -webkit-mask: url('${monogram}') center / contain no-repeat; }
  .word { font: 600 28px/1 'Inter', sans-serif; letter-spacing: -.6px; }
  .pill { position: absolute; top: 106px; left: 0; right: 0; text-align: center; font: 500 17px/1 'JetBrains Mono', monospace;
    letter-spacing: 3px; text-transform: uppercase; color: #8da0ad; }
  .hero { position: absolute; left: 285px; width: 630px; top: 140px; height: 360px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; }
  .hero .v { font: 800 220px/0.9 'Inter', sans-serif; letter-spacing: -10px; }
  .hero .l { font: 800 60px/1 'Inter', sans-serif; color: #1fd1ae; letter-spacing: -2px; margin-top: 8px; }
  .hero .s { font: 500 22px/1 'JetBrains Mono', monospace; color: #8da0ad; margin-top: 16px; letter-spacing: 1px; }
  .foot { position: absolute; bottom: 34px; left: 64px; right: 64px; display: grid; grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid #1e2a33; padding-top: 18px; }
  .foot div { text-align: center; }
  .foot .v { font: 800 34px/1 'Inter', sans-serif; letter-spacing: -1px; }
  .foot .l { color: #8da0ad; font: 500 14px/1 'JetBrains Mono', monospace; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
</style></head><body>
  <div class="glow"></div>
  <div class="bar"><span class="tile"></span><span class="word">upcode</span></div>
  <div class="pill">Cinderblock Mobile · v${totals.current_version.replace(/\+.*/, '')}</div>
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
