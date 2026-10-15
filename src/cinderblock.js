import * as d3 from 'd3';

const DATA = '/data/cinderblock/';
const int = d3.format(',');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const parseMonth = d3.utcParse('%Y-%m');
const monthName = d3.utcFormat('%b %Y');
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const load = (name) =>
  fetch(DATA + name).then((r) => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.json();
  });

function tooltip(el) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  el.appendChild(tip);
  return {
    show(event, title, lines) {
      tip.replaceChildren();
      const head = document.createElement('div');
      head.className = 'when';
      head.textContent = title;
      tip.appendChild(head);
      for (const line of lines) {
        const row = document.createElement('div');
        if (line.color) {
          const sw = document.createElement('i');
          sw.style.background = line.color;
          row.appendChild(sw);
        }
        row.append(line.text);
        tip.appendChild(row);
      }
      tip.hidden = false;
      const box = el.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      tip.style.left = `${Math.max(0, Math.min(x + 12, box.width - tip.offsetWidth))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 8)}px`;
    },
    hide() {
      tip.hidden = true;
    },
  };
}

function legend(el, items) {
  el.replaceChildren(
    ...items.map((it) => {
      const s = document.createElement('span');
      const i = document.createElement('i');
      i.style.background = it.color;
      s.append(i, it.label);
      return s;
    }),
  );
}

/** Monthly bars; several series stack, or with `diverge` the second hangs below zero. */
function monthBars(el, rows, series, { height = 240, diverge = false } = {}) {
  el.querySelector('svg')?.remove();
  el.querySelector('.tip')?.remove();
  const width = el.clientWidth || 600;
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const first = parseMonth(rows[0].month);
  const last = parseMonth(rows.at(-1).month);
  const months = d3.utcMonth.range(first, d3.utcMonth.offset(last, 1)).map((m) => {
    const key = d3.utcFormat('%Y-%m')(m);
    const r = byMonth.get(key) ?? {};
    return { date: m, month: key, ...Object.fromEntries(series.map((s) => [s.key, Number(r[s.key]) || 0])) };
  });

  const top = diverge ? d3.max(months, (d) => d[series[0].key]) : d3.max(months, (d) => d3.sum(series, (s) => d[s.key]));
  const bottom = diverge ? -d3.max(months, (d) => d[series[1].key]) : 0;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`);
  const y = d3.scaleLinear([bottom, top || 1], [height - 24, 8]).nice();
  const fmt = (v) => compact.format(Math.abs(v));
  const probe = svg.append('text').text(fmt(y.domain()[1]));
  const left = Math.max(probe.node().getComputedTextLength(), 20) + 10;
  probe.remove();
  const x = d3.scaleBand(months.map((d) => d.month), [left, width - 4]).paddingInner(0.2);

  svg.append('g').selectAll('line').data(y.ticks(4)).join('line')
    .attr('x1', left).attr('x2', width - 4).attr('y1', (v) => y(v)).attr('y2', (v) => y(v))
    .style('stroke', css('--rule'));
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text')
    .attr('x', left - 6).attr('y', (v) => y(v)).attr('dy', '0.32em').attr('text-anchor', 'end').text(fmt);
  if (diverge) {
    svg.append('line').attr('x1', left).attr('x2', width - 4).attr('y1', y(0)).attr('y2', y(0)).style('stroke', css('--ink-muted'));
  }

  const years = months.filter((d) => d.date.getUTCMonth() === 0);
  const every = Math.max(1, Math.ceil(years.length / Math.max(1, Math.floor((width - left) / 44))));
  svg.append('g').selectAll('text').data(years.filter((_, i) => i % every === 0)).join('text')
    .attr('x', (d) => x(d.month)).attr('y', height - 6).text((d) => d.date.getUTCFullYear());

  const bw = x.bandwidth();
  const marks = svg.append('g');
  for (const d of months) {
    let base = 0;
    series.forEach((s, i) => {
      const v = d[s.key];
      if (!v) return;
      const [y0, y1] = diverge ? (i === 0 ? [0, v] : [-v, 0]) : [base, base + v];
      if (!diverge) base += v;
      marks.append('rect').attr('x', x(d.month)).attr('width', bw)
        .attr('y', y(y1)).attr('height', Math.max(0, y(y0) - y(y1))).style('fill', s.color);
    });
  }

  const tip = tooltip(el);
  svg.append('g').selectAll('rect').data(months).join('rect')
    .attr('x', (d) => x(d.month) - (x.step() - bw) / 2).attr('width', x.step())
    .attr('y', 0).attr('height', height).style('fill', 'transparent')
    .on('mousemove', (event, d) =>
      tip.show(event, monthName(d.date), series.map((s) => ({
        color: series.length > 1 ? s.color : null,
        text: `${series.length > 1 ? `${s.label}: ` : ''}${int(d[s.key])}`,
      }))))
    .on('mouseleave', () => tip.hide());
}

function hBars(el, rows, labelKey, valueKey, color) {
  el.querySelector('svg')?.remove();
  const width = el.clientWidth || 600;
  const data = rows.map((r) => ({ label: String(r[labelKey]), value: Number(r[valueKey]) }));
  const rowH = 28;
  const height = data.length * rowH + 4;
  el.style.minHeight = `${height}px`;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`);
  const probe = svg.append('g');
  const labelW = d3.max(data, (d) => probe.append('text').text(d.label).node().getComputedTextLength());
  const valueW = d3.max(data, (d) => probe.append('text').text(int(d.value)).node().getComputedTextLength());
  probe.remove();
  const x = d3.scaleLinear([0, d3.max(data, (d) => d.value)], [labelW + 10, width - valueW - 10]);
  const row = svg.selectAll('g').data(data).join('g').attr('transform', (_, i) => `translate(0,${i * rowH})`);
  row.append('text').attr('x', labelW).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end').text((d) => d.label);
  row.append('rect').attr('x', x(0)).attr('y', 7).attr('height', rowH - 14)
    .attr('width', (d) => Math.max(1, x(d.value) - x(0))).style('fill', color);
  row.append('text').attr('x', (d) => x(d.value) + 6).attr('y', rowH / 2).attr('dy', '0.32em').text((d) => int(d.value));
}

function fillTable(table, rows) {
  table.querySelector('tbody').replaceChildren(
    ...rows.map((r) => {
      const tr = document.createElement('tr');
      for (const [value, numeric] of [[r.language, false], [int(r.files), true], [int(r.lines), true]]) {
        const td = document.createElement('td');
        if (numeric) td.className = 'num';
        td.textContent = value;
        tr.appendChild(td);
      }
      return tr;
    }),
  );
}

function renderFigures(t) {
  const thisYear = new Date().getUTCFullYear();
  const notes = {
    reviews: `${int(t.merged_mrs)} GitLab MRs · ${int(t.merged_prs)} GitHub PRs`,
    tags: `${int(t.dev_builds)} dev · ${int(t.rc_builds)} rc · ${int(t.store_builds)} store`,
    commits: `since ${monthName(new Date(t.first_commit))}`,
    dart_lines: `${int(t.dart_files)} files, hand-written`,
    synced_domains: `${t.proto_messages} protobuf messages stored locally`,
    test_files: `plus ${t.integration_suites} integration suites`,
  };
  const values = { ...t, reviews: t.merged_mrs + t.merged_prs };
  for (const el of document.querySelectorAll('[data-total]')) el.textContent = int(values[el.dataset.total]);
  for (const el of document.querySelectorAll('[data-note]')) el.textContent = notes[el.dataset.note];
  document.getElementById('meta').textContent =
    `v${t.current_version} · latest store release ${t.latest_store_release} · updated ${t.updated}`;
  return thisYear;
}

async function main() {
  const [totals, commits, builds, mrs, languages, areas] = await Promise.all(
    ['totals.json', 'commits_monthly.json', 'builds_monthly.json', 'mrs_monthly.json', 'languages.json', 'lib_areas.json'].map(load),
  );
  const year = renderFigures(totals);
  const buildsThisYear = d3.sum(builds.filter((b) => b.month.startsWith(String(year))), (b) => b.dev + b.rc + b.store + b.other);
  const mrsThisYear = d3.sum(mrs.filter((m) => m.month.startsWith(String(year))), (m) => m.merged_mrs + m.merged_prs);
  const takeaway = document.getElementById('takeaway');
  takeaway.classList.remove('loading');
  takeaway.textContent = `${int(buildsThisYear)} builds and ${int(mrsThisYear)} reviewed changes so far in ${year}, `
    + `out of ${int(totals.tags)} builds and ${int(totals.merged_mrs + totals.merged_prs)} reviewed changes overall.`;

  const draw = () => {
    const kinds = [
      { key: 'dev', label: 'Dev (+main)', color: css('--series-1') },
      { key: 'rc', label: 'Release candidate', color: css('--series-2') },
      { key: 'store', label: 'Store release', color: css('--series-3') },
      { key: 'other', label: 'Older tags', color: css('--series-4') },
    ];
    legend(document.getElementById('builds-legend'), kinds);
    monthBars(document.getElementById('builds-chart'), builds, kinds, { height: 300 });
    const reviews = [
      { key: 'merged_mrs', label: 'GitLab MRs', color: css('--series-1') },
      { key: 'merged_prs', label: 'GitHub PRs', color: css('--series-2') },
    ];
    legend(document.getElementById('mrs-legend'), reviews);
    monthBars(document.getElementById('mrs-chart'), mrs, reviews, { height: 300 });
    monthBars(document.getElementById('commits-chart'), commits, [{ key: 'commits', label: 'Commits', color: css('--series-1') }]);
    const churn = [
      { key: 'lines_added', label: 'Added', color: css('--good') },
      { key: 'lines_removed', label: 'Removed', color: css('--bad') },
    ];
    legend(document.getElementById('churn-legend'), churn);
    monthBars(document.getElementById('churn-chart'), commits, churn, { diverge: true });
    hBars(document.getElementById('areas-chart'), areas, 'area', 'lines', css('--series-1'));
  };
  draw();
  fillTable(document.getElementById('langs-table'), languages);
  let resize;
  new ResizeObserver(() => {
    clearTimeout(resize);
    resize = setTimeout(draw, 150);
  }).observe(document.querySelector('.page'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
}

main().catch((error) => {
  const takeaway = document.getElementById('takeaway');
  takeaway.classList.add('error');
  takeaway.textContent = `The numbers didn't load (${error.message}). Reload the page to try again.`;
});
