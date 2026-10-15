// Renders the work page from public/data/work/projects.json. Client names never appear in
// the data: each product is described by what it is.
const PLATFORM_ORDER = ['iOS', 'Android', 'Web', 'macOS', 'Windows'];

const yearsLabel = ([from, to]) => {
  if (!to) return `${from} – now`;
  return from === to ? String(from) : `${from} – ${to}`;
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function card(project) {
  const article = el('article', `work-card${project.years[1] ? '' : ' current'}`);
  const top = el('div', 'top');
  top.append(el('span', `kind${project.design ? ' design' : ''}`, project.kind), el('span', 'years', yearsLabel(project.years)));
  const tags = el('div', 'tags');
  for (const p of project.platforms) tags.append(el('span', 'tag platform', p));
  for (const s of project.stack) tags.append(el('span', 'tag', s));
  article.append(top, el('h3', null, project.title), el('p', null, project.summary), tags);
  return article;
}

function render(projects) {
  const now = new Date().getUTCFullYear();
  const first = Math.min(...projects.map((p) => p.years[0]));
  const last = Math.max(...projects.map((p) => p.years[1] ?? now));
  const platforms = PLATFORM_ORDER.filter((p) => projects.some((x) => x.platforms.includes(p)));
  const flutter = projects.filter((p) => p.stack.includes('Flutter')).length;

  const figures = {
    projects: String(projects.length),
    span: String(last - first + 1),
    range: `${first} – ${last}`,
    platforms: String(platforms.length),
    'platform-list': platforms.join(' · '),
    flutter: `${Math.round((flutter / projects.length) * 100)}%`,
  };
  for (const node of document.querySelectorAll('[data-figure]')) node.textContent = figures[node.dataset.figure];

  const intro = document.getElementById('intro');
  intro.classList.remove('loading');
  intro.textContent = `${projects.length} products since ${first}, from offline-first field apps to platforms with `
    + 'their own backends and web consoles. Mostly Flutter, one codebase per product, shipped to the stores.';

  const sorted = [...projects].sort((a, b) => (b.years[1] ?? now + 1) - (a.years[1] ?? now + 1) || b.years[0] - a.years[0]);
  document.getElementById('work-grid').replaceChildren(...sorted.map(card));
}

fetch('/data/work/projects.json')
  .then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(render)
  .catch((error) => {
    const intro = document.getElementById('intro');
    intro.classList.add('error');
    intro.textContent = `The projects didn't load (${error.message}). Reload the page to try again.`;
  });
