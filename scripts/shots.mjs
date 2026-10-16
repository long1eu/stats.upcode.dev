// Renders the illustrative product screens on the work page (public/work/shots/<id>.png).
// They are illustrations in the Upcode style, not screenshots of client apps, and each image
// says so; client apps and data stay private.
//
//   node scripts/shots.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}; set CHROME to its executable.`);
  process.exit(2);
}

const T = { bg: '#0a0f14', surface: '#121a22', border: '#1e2a33', text: '#f2f6f8', muted: '#8da0ad', teal: '#1fd1ae', amber: '#ffb547', blue: '#7cc4ff', red: '#ff6b6b' };

const bar = (title, right = '') => `<div class="appbar"><span>${title}</span><span class="r">${right}</span></div>`;
const row = (title, sub, pill, color = T.teal) =>
  `<div class="row"><div><div class="t">${title}</div><div class="s">${sub}</div></div><span class="pill" style="color:${color};border-color:${color}55">${pill}</span></div>`;
const bars = (values, color = T.teal) =>
  `<div class="bars">${values.map((v) => `<i style="height:${v}%;background:${color}"></i>`).join('')}</div>`;
const ring = (pct, label, color) =>
  `<div class="ring" style="background:conic-gradient(${color} ${pct * 3.6}deg, ${T.border} 0)"><div><b>${pct}%</b><span>${label}</span></div></div>`;

const SCREENS = {
  'field-service': [
    `${bar('Jobs', 'Today')}<div class="banner">Offline · 3 changes will sync</div>
     ${row('Kitchen remodel — Oak St', 'Estimate approved · 9:00', 'In progress')}
     ${row('Roof repair — Pine Ave', 'Crew of 3 · 11:30', 'Scheduled', T.blue)}
     ${row('Deck build — Elm Ct', 'Invoice sent', 'Invoiced', T.amber)}
     ${row('Bathroom tiling — Main St', 'Materials ordered', 'Scheduled', T.blue)}
     ${row('Fence install — Birch Rd', 'Paid in full', 'Done', T.muted)}`,
    `${bar('Invoice #1042', 'Draft')}<div class="card big"><div class="s">Total due</div><div class="num">$4,280.00</div></div>
     ${row('Labour · 32 h', '$2,560.00', 'Line')}${row('Materials', '$1,420.00', 'Line')}${row('Disposal fee', '$300.00', 'Line')}
     <div class="btn">Collect payment</div>`,
  ],
  infrastructure: [
    `${bar('Assets', 'Live')}<div class="map">${Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 88 + 4}%;top:${(i * 53) % 80 + 8}%;background:${i % 5 === 0 ? T.amber : T.teal}"></i>`).join('')}<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="5,80 20,60 38,66 55,40 72,46 92,18" fill="none" stroke="${T.teal}" stroke-width="1.2" stroke-dasharray="3 2"/></svg></div>
     ${row('Rail section km 42', 'Track geometry nominal', 'OK')}${row('Dam sensor D-4', 'Water level rising', 'Watch', T.amber)}`,
    `${bar('Inspection', 'Dam D-4')}<div class="card"><div class="s">Water level · 24 h</div>${bars([42, 44, 47, 51, 56, 60, 63, 66], T.amber)}</div>
     ${row('Spillway gates', 'Checked on site', 'Pass')}${row('Seepage', 'Minor, logged', 'Watch', T.amber)}${row('Crest survey', 'Scheduled 14:00', 'Open', T.muted)}
     <div class="btn">Submit inspection</div>`,
  ],
  city: [
    `${bar('Patrol', 'District 3')}<div class="map">${Array.from({ length: 11 }, (_, i) => `<i style="left:${(i * 41) % 86 + 6}%;top:${(i * 29) % 78 + 10}%;background:${i % 3 === 0 ? T.red : i % 3 === 1 ? T.amber : T.teal}"></i>`).join('')}</div>
     ${row('Pothole — Main St 14', 'Reported 08:42', 'New', T.red)}${row('Broken streetlight', 'Park Ave · assigned', 'In progress', T.amber)}`,
    `${bar('Report issue', 'Draft')}<div class="card"><div class="s">Category</div><div class="t big">Road damage</div><div class="s">Location attached · 2 photos</div></div>
     ${row('Severity', 'Affects traffic', 'High', T.red)}${row('Department', 'Roads & maintenance', 'Auto')}${row('Similar reports', '2 nearby this week', 'Linked', T.blue)}
     <div class="btn">Send to council</div>`,
  ],
  athlete: [
    `${bar('Today', 'Team')}<div class="card"><div class="s">Training load · 7 days</div>${bars([40, 55, 70, 35, 80, 65, 90])}</div>
     ${row('Sprint intervals', '8 × 200 m · 6:30', 'Today')}${row('Recovery session', 'Mobility · 30 min', 'Tomorrow', T.blue)}`,
    `${bar('Squad', '24 athletes')}${row('A. Morgan', 'Readiness 92', 'Ready')}${row('J. Patel', 'Readiness 78', 'Ready')}
     ${row('S. Okafor', 'Readiness 54', 'Low', T.amber)}${row('L. Novak', 'Injury: hamstring', 'Rest', T.red)}${row('M. Silva', 'Readiness 88', 'Ready')}`,
  ],
  nutrition: [
    `${bar('Today', 'Diary')}<div class="rings">${ring(68, 'net carbs', T.teal)}${ring(81, 'protein', T.blue)}${ring(54, 'fat', T.amber)}</div>
     ${row('Breakfast', 'Eggs, avocado · 6 g carbs', '410 kcal', T.muted)}${row('Lunch', 'Chicken salad · 9 g carbs', '520 kcal', T.muted)}`,
    `${bar('Add food', 'Search')}<div class="search">Search foods or scan a barcode</div>
     ${row('Greek yogurt', '5 g net carbs', '+ Add')}${row('Almonds, 30 g', '3 g net carbs', '+ Add')}${row('Salmon fillet', '0 g net carbs', '+ Add')}${row('Blueberries, 50 g', '6 g net carbs', '+ Add')}`,
  ],
  fintech: [
    `${bar('Unlock', 'Secure')}<div class="card"><div class="s">Enter your passcode</div><div class="num">• • • •</div><div class="s">Or use Touch ID</div></div>
     ${row('Messages are encrypted', 'Stored with SQLCipher on this device', 'On')}${row('Session timeout', 'Locks after 5 minutes', 'Auto', T.blue)}`,
    `${bar('Wealth team', '3 online')}${row('Your relationship manager', 'The portfolio review is ready to sign', 'New', T.teal)}
     ${row('Q3 statement.pdf', 'Shared document · 2 pages', 'Open', T.blue)}${row('You', 'Thanks, I will review it tonight', 'Sent', T.muted)}
     ${row('Compliance', 'This conversation is archived', 'Info', T.amber)}`,
  ],
  industrial: [
    `${bar('Device', 'USB · Ch 3')}${row('Command block', 'Voltage max 16.0 V', 'Set')}${row('Ramp block', 'Rise time 120 ms', 'Set')}
     ${row('Solenoid block', 'Current limit 1.8 A', 'Read', T.blue)}${row('Save to board', 'Persist all parameters', 'Write', T.amber)}`,
    `${bar('Live values', 'BLE')}<div class="card"><div class="s">Solenoid current · live</div>${bars([30, 45, 62, 58, 70, 66, 74, 80], T.blue)}</div>
     ${row('Recording', '4 ms sampling · 2 tracks', 'Rec', T.red)}${row('Export', 'CSV for analysis', 'Ready')}`,
  ],
  quiz: [
    `${bar('Live quiz', 'Round 3/5')}<div class="card"><div class="s">Question 7 · 12 s left</div><div class="t big">Which planet has the shortest day?</div></div>
     ${row('Jupiter', '41% of players', 'Your pick')}${row('Saturn', '27% of players', '', T.muted)}${row('Neptune', '19% of players', '', T.muted)}${row('Mars', '13% of players', '', T.muted)}`,
    `${bar('Friends', 'This week')}<div class="card"><div class="s">Your streak</div><div class="num">12 days</div>${bars([60, 75, 50, 90, 70, 85, 100])}</div>
     ${row('Maria challenged you', 'History · 10 questions', 'Play', T.blue)}${row('You beat Alex', '9 / 10 in Science', '+120')}${row('Weekly league', 'Rank 4 of 30', 'Top 5', T.amber)}`,
  ],
};

const css = `
  html, body { margin: 0; width: 1200px; height: 750px; overflow: hidden; }
  body { background: ${T.bg}; font-family: 'Inter', sans-serif; color: ${T.text}; position: relative; -webkit-font-smoothing: antialiased; }
  .glow { position: absolute; width: 900px; height: 900px; left: 160px; top: -160px; filter: blur(70px);
    background: radial-gradient(circle, rgba(31,209,174,.28) 0%, rgba(31,209,174,.06) 45%, transparent 68%); }
  .label { position: absolute; top: 26px; right: 30px; font: 500 15px/1 'JetBrains Mono', monospace; letter-spacing: 2px; text-transform: uppercase;
    color: ${T.muted}; border: 1px solid ${T.border}; border-radius: 999px; padding: 9px 14px; background: rgba(18,26,34,.8); }
  .phone { position: absolute; width: 300px; height: 620px; border-radius: 42px; background: #05080b; border: 2px solid #26343f;
    box-shadow: 0 40px 80px rgba(0,0,0,.55); padding: 12px; box-sizing: border-box; }
  .phone.a { left: 300px; top: 70px; z-index: 2; }
  .phone.b { left: 610px; top: 110px; transform: scale(.94); opacity: .96; }
  .screen { width: 100%; height: 100%; border-radius: 31px; background: ${T.bg}; overflow: hidden; padding: 44px 14px 14px; box-sizing: border-box;
    display: flex; flex-direction: column; gap: 9px; position: relative; }
  .screen::before { content: ''; position: absolute; top: 12px; left: 50%; width: 86px; height: 22px; margin-left: -43px; background: #000; border-radius: 12px; }
  .appbar { display: flex; justify-content: space-between; align-items: baseline; font: 800 22px/1 'Inter', sans-serif; letter-spacing: -.6px; margin-bottom: 4px; }
  .appbar .r { font: 500 11px/1 'JetBrains Mono', monospace; color: ${T.muted}; letter-spacing: 1px; text-transform: uppercase; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 12px; padding: 10px 11px; }
  .row .t { font: 600 13px/1.25 'Inter', sans-serif; }
  .row .s, .card .s { font: 400 11px/1.3 'Inter', sans-serif; color: ${T.muted}; margin-top: 2px; }
  .pill { font: 500 10px/1 'JetBrains Mono', monospace; border: 1px solid; border-radius: 999px; padding: 5px 7px; white-space: nowrap; }
  .card { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 14px; padding: 12px; }
  .card .num { font: 800 30px/1.1 'Inter', sans-serif; letter-spacing: -1px; margin: 4px 0; }
  .card .t.big { font: 700 16px/1.3 'Inter', sans-serif; margin: 6px 0; }
  .banner { font: 500 11px/1 'JetBrains Mono', monospace; color: ${T.amber}; border: 1px dashed ${T.amber}66; border-radius: 10px; padding: 9px 10px; }
  .btn { margin-top: auto; background: ${T.teal}; color: #06231e; font: 700 14px/1 'Inter', sans-serif; text-align: center; padding: 14px; border-radius: 12px; }
  .bars { display: flex; align-items: flex-end; gap: 6px; height: 70px; margin-top: 8px; }
  .bars i { flex: 1; border-radius: 4px; opacity: .9; }
  .map { position: relative; height: 250px; border-radius: 14px; border: 1px solid ${T.border}; overflow: hidden;
    background-color: #0d151c; background-image: linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px); background-size: 28px 28px; }
  .map i { position: absolute; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
  .map svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .rings { display: flex; justify-content: space-between; gap: 6px; }
  .ring { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; }
  .ring > div { width: 66px; height: 66px; border-radius: 50%; background: ${T.bg}; display: grid; place-content: center; text-align: center; }
  .ring b { font: 800 16px/1 'Inter', sans-serif; }
  .ring span { font: 400 9px/1.2 'Inter', sans-serif; color: ${T.muted}; }
  .search { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 12px; font: 400 12px/1 'Inter', sans-serif; color: ${T.muted}; }
`;

const out = fileURLToPath(new URL('../public/work/shots/', import.meta.url));
mkdirSync(out, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), 'shots-'));
for (const [id, [a, b]] of Object.entries(SCREENS)) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>${css}</style></head><body><div class="glow"></div><div class="label">Illustration</div>
<div class="phone a"><div class="screen">${a}</div></div><div class="phone b"><div class="screen">${b}</div></div></body></html>`;
  const page = join(dir, `${id}.html`);
  writeFileSync(page, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,750', '--virtual-time-budget=5000', `--screenshot=${join(out, `${id}.png`)}`, `file://${page}`,
  ], { stdio: 'ignore' });
  console.log(`wrote public/work/shots/${id}.png`);
}
