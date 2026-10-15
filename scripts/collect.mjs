// Collects the numbers the site shows from a cb-mobile checkout and its GitLab project.
//
//   node scripts/collect.mjs ../cb-mobile
//
// Needs `git` and an authenticated `glab` that can read the project. Writes JSON into
// public/data/cinderblock/. Aggregates only: no names or per-person figures leave this script.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const repo = process.argv[2];
if (!repo || !existsSync(join(repo, '.git'))) {
  console.error('usage: node scripts/collect.mjs <path to a cb-mobile checkout>');
  process.exit(2);
}
const out = new URL('../public/data/cinderblock/', import.meta.url);

const run = (cmd, args) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 30 });

// Generated code, vendored packages, lock files, coverage reports and data files.
const NOT_HAND_WRITTEN = new RegExp(
  [
    'node_modules/', '/dist/', '\\.min\\.', '\\.d\\.ts$', 'generated', '\\.g\\.dart$', '\\.freezed\\.dart$',
    '\\.pb\\w*\\.dart$', '\\.gr\\.dart$', '\\.config\\.dart$', '\\.mocks\\.dart$', 'schema_versions\\.dart$',
    'sync_engine/proto/conversions\\.dart$', '^coverage/', 'lcov', '^third_party/', '\\.lock$', 'pbxproj$',
    '\\.json$', '\\.arb$', 'release-notes', '\\.svg$', '\\.plist$', '\\.xml$', '\\.xcworkspacedata$',
    '\\.storyboard$', '\\.xib$', '\\.pem$', '\\.proto$', '^private/',
  ].join('|'),
);
const handWritten = (path) => !NOT_HAND_WRITTEN.test(path);

const LANG = {
  '.dart': 'Dart', '.kt': 'Kotlin', '.swift': 'Swift', '.m': 'Objective-C', '.h': 'Objective-C', '.rb': 'Ruby',
  '.sh': 'Shell', '.yml': 'YAML', '.yaml': 'YAML', '.gradle': 'Gradle', '.kts': 'Gradle', '.md': 'Markdown',
  '.cpp': 'C++', '.cc': 'C++', '.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript', '.html': 'HTML',
  '.iss': 'Inno Setup', '.css': 'CSS',
};

function buildKind(tag) {
  if (tag.endsWith('+main')) return 'dev';
  if (/\+rc\d+$/.test(tag)) return 'rc';
  if (/^v\d+\.\d+\.\d+$/.test(tag)) return 'store';
  return 'other';
}

function write(name, data) {
  writeFileSync(new URL(name, out), `${JSON.stringify(data, null, 1)}\n`);
  console.log(`wrote public/data/cinderblock/${name}`);
}

// Commits and churn per month.
const monthly = new Map();
let current = null;
const log = run('git', ['-c', 'diff.renameLimit=5000', 'log', '--no-merges', '--format=@@%ad|%s', '--date=format:%Y-%m', '--numstat']);
for (const line of log.split('\n')) {
  if (line.startsWith('@@')) {
    const [month, subject] = line.slice(2).split('|');
    current = month;
    const m = monthly.get(month) ?? { month, commits: 0, version_bumps: 0, lines_added: 0, lines_removed: 0 };
    m.commits += 1;
    if (subject.startsWith('bump version')) m.version_bumps += 1;
    monthly.set(month, m);
  } else if (current && line.trim()) {
    const [added, removed, path] = line.split('\t');
    if (/^\d+$/.test(added) && path && handWritten(path)) {
      const m = monthly.get(current);
      m.lines_added += Number(added);
      m.lines_removed += Number(removed);
    }
  }
}
const commitsMonthly = [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month));
write('commits_monthly.json', commitsMonthly);

// Builds per month, by kind.
const builds = new Map();
const tagLines = run('git', ['for-each-ref', '--format=%(creatordate:format:%Y-%m)|%(refname:short)', 'refs/tags']).split('\n').filter(Boolean);
for (const line of tagLines) {
  const [month, tag] = line.split('|');
  const b = builds.get(month) ?? { month, dev: 0, rc: 0, store: 0, other: 0 };
  b[buildKind(tag)] += 1;
  builds.set(month, b);
}
write('builds_monthly.json', [...builds.values()].sort((a, b) => a.month.localeCompare(b.month)));

// Merged merge requests per month.
const mrs = new Map();
for (let page = 1; ; page++) {
  const batch = JSON.parse(run('glab', ['api', `projects/:id/merge_requests?state=merged&per_page=100&page=${page}`]));
  if (!batch.length) break;
  for (const mr of batch) {
    if (!mr.merged_at) continue;
    const month = mr.merged_at.slice(0, 7);
    mrs.set(month, (mrs.get(month) ?? 0) + 1);
  }
}
const mrsMonthly = [...mrs.entries()].map(([month, merged_mrs]) => ({ month, merged_mrs })).sort((a, b) => a.month.localeCompare(b.month));
write('mrs_monthly.json', mrsMonthly);

// Code size by language and by app folder.
const langs = new Map();
const areas = new Map();
let testFiles = 0;
for (const path of run('git', ['ls-files']).split('\n')) {
  const lang = LANG[extname(path)];
  const full = join(repo, path);
  if (!path || !lang || !handWritten(path) || !existsSync(full) || !statSync(full).isFile()) continue;
  const lines = readFileSync(full, 'utf8').split('\n').length - 1;
  const l = langs.get(lang) ?? { language: lang, files: 0, lines: 0 };
  l.files += 1;
  l.lines += lines;
  langs.set(lang, l);
  if (path.startsWith('test/') && path.endsWith('_test.dart')) testFiles += 1;
  if (path.startsWith('lib/src/') && path.endsWith('.dart')) {
    const parts = path.split('/');
    const area = parts.length > 3 ? parts[2] : '(root)';
    const a = areas.get(area) ?? { area, files: 0, lines: 0 };
    a.files += 1;
    a.lines += lines;
    areas.set(area, a);
  }
}
const languages = [...langs.values()].sort((a, b) => b.lines - a.lines);
write('languages.json', languages);
write('lib_areas.json', [...areas.values()].sort((a, b) => b.lines - a.lines));

// Headline totals.
const pubspec = readFileSync(join(repo, 'pubspec.yaml'), 'utf8');
const proto = readFileSync(join(repo, 'lib/src/data/sync_engine/proto/cinderblock.proto'), 'utf8');
const tags = tagLines.map((l) => l.split('|')[1]);
const store = tags.filter((t) => buildKind(t) === 'store').sort((a, b) => {
  const [x, y] = [a, b].map((t) => t.slice(1).split('.').map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
});
const authors = new Set();
for (let page = 1; ; page++) {
  const batch = JSON.parse(run('glab', ['api', `projects/:id/merge_requests?state=merged&per_page=100&page=${page}`]));
  if (!batch.length) break;
  for (const mr of batch) if (mr.merged_at && mr.author?.username !== 'ghost') authors.add(mr.author.username);
}
const commitDates = run('git', ['log', '--no-merges', '--format=%ad', '--date=short']).split('\n').filter(Boolean);
const dart = langs.get('Dart') ?? { files: 0, lines: 0 };
write('totals.json', {
  updated: new Date().toISOString().slice(0, 10),
  current_version: /^version: (\S+)/m.exec(pubspec)[1],
  latest_store_release: store.at(-1),
  merged_mrs: mrsMonthly.reduce((s, r) => s + r.merged_mrs, 0),
  first_mr_month: mrsMonthly[0]?.month,
  mr_authors: authors.size,
  tags: tags.length,
  dev_builds: tags.filter((t) => buildKind(t) === 'dev').length,
  rc_builds: tags.filter((t) => buildKind(t) === 'rc').length,
  store_builds: store.length,
  commits: commitDates.length,
  first_commit: commitDates.at(-1),
  dart_lines: dart.lines,
  dart_files: dart.files,
  test_files: testFiles,
  integration_suites: readdirSync(join(repo, 'integration_test')).filter((f) => f.endsWith('_test.dart')).length,
  synced_domains: readdirSync(join(repo, 'lib/src/data/sync_engine')).filter((f) => f.endsWith('.dart') && f !== 'index.dart').length,
  proto_messages: (proto.match(/^message /gm) ?? []).length,
});
