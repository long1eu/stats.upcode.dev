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
  if (project.shot) {
    const shot = el('div', 'shot');
    const img = el('img');
    img.src = `/work/shots/${project.shot}.png`;
    img.alt = `Illustration of the ${project.title.toLowerCase()} screens`;
    img.loading = 'lazy';
    img.width = 1200;
    img.height = 750;
    shot.append(img);
    article.append(shot);
  }
  const top = el('div', 'top');
  top.append(el('span', `kind${project.design ? ' design' : ''}`, project.kind), el('span', 'years', yearsLabel(project.years)));
  const tags = el('div', 'tags');
  for (const p of project.platforms) tags.append(el('span', 'tag platform', p));
  for (const s of project.stack) tags.append(el('span', 'tag', s));
  article.append(top, el('h3', null, project.title), el('p', null, project.summary), tags);
  if (project.case) {
    const link = el('a', 'case-link', 'Read the case study →');
    link.href = project.case;
    article.append(link);
  }
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
  document.getElementById('featured-grid').replaceChildren(...sorted.filter((p) => p.shot).map(card));
  document.getElementById('work-grid').replaceChildren(...sorted.filter((p) => !p.shot).map(card));
}

function renderQuotes(quotes) {
  document.getElementById('quotes').replaceChildren(...quotes.map((q) => {
    const fig = el('figure', 'quote');
    const cap = el('figcaption');
    cap.append(el('span', null, `${q.context} · ${q.year}`));
    fig.append(el('blockquote', null, q.quote), cap);
    return fig;
  }));
  document.getElementById('reviews-note').textContent =
    `${quotes.length} reviews from Upwork, quoted as written; the Upcode agency has a 100% Job Success Score and over $1M earned across 22,000+ hours.`;
}

function renderTalks(talks) {
  document.getElementById('talks').replaceChildren(...talks.map((t) => {
    const node = t.url ? el('a', 'talk') : el('div', 'talk');
    if (t.url) {
      node.href = t.url;
      node.target = '_blank';
      node.rel = 'noopener';
    }
    const meta = el('div', 'meta');
    meta.append(el('span', null, t.kind), el('span', null, String(t.year)));
    node.append(meta, el('h3', null, t.title), el('span', 'event', t.event));
    return node;
  }));
}

function renderOss(oss) {
  const fmt = new Intl.NumberFormat('en');
  document.getElementById('oss').replaceChildren(...oss.repos.map((r) => {
    const a = el('a', 'repo');
    a.href = r.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const head = el('div', 'head');
    head.append(el('span', 'name', r.name), el('span', 'stars', `★ ${fmt.format(r.stars)}`));
    a.append(head, el('p', null, r.summary), el('span', 'lang', `${r.language} · ${fmt.format(r.forks)} forks`));
    return a;
  }));
  document.getElementById('upstream').replaceChildren(...oss.upstream.map((u) => {
    const a = el('a');
    a.href = u.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const b = el('b', null, String(u.commits));
    a.append(`${u.project} · `, b, ` commit${u.commits === 1 ? '' : 's'}`);
    return a;
  }));
  const stars = oss.repos.reduce((s, r) => s + r.stars, 0);
  document.getElementById('oss-note').textContent =
    `${fmt.format(stars)} GitHub stars across the libraries below, plus contributions to Flutter itself and the packages Flutter teams rely on. Counts as of ${oss.updated}.`;
}

document.getElementById('copy-email').addEventListener('click', async (event) => {
  const email = document.getElementById('email');
  try {
    await navigator.clipboard.writeText(email.textContent);
    event.target.textContent = 'Copied';
  } catch {
    getSelection().selectAllChildren(email);
    event.target.textContent = 'Press ⌘C';
  }
});

const loadJson = (name) => fetch(`/data/work/${name}`).then((r) => {
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.json();
});
loadJson('testimonials.json').then(renderQuotes).catch(() => document.getElementById('clients').remove());
loadJson('oss.json').then(renderOss).catch(() => document.getElementById('open-source').remove());
loadJson('talks.json').then(renderTalks).catch(() => document.getElementById('speaking').remove());

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
