// Builds the link preview (Slack, iMessage, social) for the Cinderblock page from its data:
// renders the 1200x630 image with headless Chrome and writes the stats into the page's
// description tags, so the preview text carries the numbers even where images don't load.
//
//   node scripts/og.mjs
import { execFileSync } from 'node:child_process';
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
  .reduce((sum, r) => sum + r.merged_mrs, 0);

const int = (n) => n.toLocaleString('en-US');
const thousands = (n) => `${Math.round(n / 1000)}k`;

// The text Slack shows under the title.
const description =
  `${int(totals.merged_mrs)} merged MRs (${int(mrsThisYear)} in ${year}) · ` +
  `${int(totals.tags)} builds (${int(buildsThisYear)} in ${year}) · ` +
  `${int(totals.commits)} commits · ${thousands(totals.dart_lines)} lines of Dart · ` +
  `${totals.synced_domains} offline-synced domains. Latest: v${totals.current_version.replace(/\+.*/, '')}.`;

const pagePath = new URL('../cinderblock/index.html', import.meta.url);
const page = readFileSync(pagePath, 'utf8')
  .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
  // A new image URL per data refresh, so Slack fetches it instead of reusing its cached copy.
  .replace(/(<meta property="og:image" content="[^"?]*)(\?v=[^"]*)?(")/, `$1?v=${totals.updated}-${totals.tags}$3`);
writeFileSync(pagePath, page);
console.log(`description: ${description}`);

const figures = [
  [int(totals.merged_mrs), 'Merged MRs', `${int(mrsThisYear)} in ${year}`],
  [int(totals.tags), 'Tagged builds', `${int(buildsThisYear)} in ${year}`],
  [int(totals.commits), 'Commits', `since ${totals.first_commit.slice(0, 4)}`],
  [thousands(totals.dart_lines), 'Lines of Dart', `${int(totals.dart_files)} files`],
  [String(totals.synced_domains), 'Offline-synced domains', `${totals.proto_messages} protobuf messages`],
  [String(totals.test_files), 'Test files', `+ ${totals.integration_suites} integration suites`],
];

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body { background: #0d1b2e; color: #e6eef8; font-family: 'IBM Plex Mono', monospace; box-sizing: border-box;
    background-image: linear-gradient(rgba(150,190,240,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(150,190,240,.08) 1px, transparent 1px);
    background-size: 30px 30px; padding: 52px 64px; display: flex; flex-direction: column; justify-content: space-between; }
  .eyebrow { color: #f2a93b; font-size: 20px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
  h1 { font: 800 60px/1.02 'Archivo', sans-serif; margin: 12px 0 0; letter-spacing: -.01em; }
  .figs { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 3px solid #e6eef8; }
  .fig { padding: 20px 0 14px; border-bottom: 1px solid rgba(150,190,240,.25); }
  .v { font: 800 50px/1 'Archivo', sans-serif; }
  .l { color: #93a6bd; font-size: 16px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-top: 8px; }
  .s { color: #f2a93b; font-size: 16px; margin-top: 4px; }
</style></head><body>
  <div><div class="eyebrow">stats.upcode.dev · v${totals.current_version.replace(/\+.*/, '')}</div><h1>Cinderblock Mobile in numbers</h1></div>
  <div class="figs">${figures.map(([v, l, s]) => `<div class="fig"><div class="v">${v}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join('')}</div>
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
