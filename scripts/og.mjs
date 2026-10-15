// Renders the 1200x630 link-preview image (Slack, iMessage, social) for the Cinderblock page
// from public/data/cinderblock/totals.json, using headless Chrome.
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

const totals = JSON.parse(readFileSync(new URL('../public/data/cinderblock/totals.json', import.meta.url), 'utf8'));
const int = (n) => n.toLocaleString('en-US');
const figures = [
  ['Merged MRs', int(totals.merged_mrs)],
  ['Tagged builds', int(totals.tags)],
  ['Commits', int(totals.commits)],
  ['Dart lines', `${Math.round(totals.dart_lines / 1000)}k`],
];

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=IBM+Plex+Mono:wght@600&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body { background: #0d1b2e; color: #e6eef8; font-family: 'IBM Plex Mono', monospace;
    background-image: linear-gradient(rgba(150,190,240,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(150,190,240,.08) 1px, transparent 1px);
    background-size: 30px 30px; box-sizing: border-box; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
  .eyebrow { color: #f2a93b; font-size: 22px; letter-spacing: .14em; text-transform: uppercase; }
  h1 { font: 800 76px/1.02 'Archivo', sans-serif; margin: 18px 0 0; letter-spacing: -.01em; }
  .figs { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 3px solid #e6eef8; padding-top: 26px; gap: 24px; }
  .v { font: 800 58px/1 'Archivo', sans-serif; }
  .l { color: #93a6bd; font-size: 18px; letter-spacing: .08em; text-transform: uppercase; margin-top: 10px; }
</style></head><body>
  <div><div class="eyebrow">stats.upcode.dev · Cinderblock</div><h1>Cinderblock Mobile<br>in numbers</h1></div>
  <div class="figs">${figures.map(([l, v]) => `<div><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'og-'));
const page = join(dir, 'og.html');
writeFileSync(page, html);
const output = fileURLToPath(new URL('../public/cinderblock/og.png', import.meta.url));
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--virtual-time-budget=5000', `--screenshot=${output}`, `file://${page}`,
], { stdio: 'ignore' });
console.log(`wrote public/cinderblock/og.png`);
