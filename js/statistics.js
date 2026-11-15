const numberFormat = new Intl.NumberFormat('id-ID');
const dayMillis = 86400000;
const dates = new Map();
const regions = new Intl.Collator('id-ID', { numeric: true, sensitivity: 'base' });
const svgNamespace = 'http://www.w3.org/2000/svg';
let chartId = 0;

export function formatNumber(value) {
  return numberFormat.format(value);
}

export function formatDate(iso, { short = false, year = true } = {}) {
  if (!iso) return '—';
  const key = [short, year].join('/');
  if (!dates.has(key)) {
    dates.set(key, new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: short ? 'short' : 'long', year: year ? 'numeric' : undefined,
      timeZone: 'UTC',
    }));
  }
  return dates.get(key).format(new Date(iso + 'T00:00:00Z'));
}

export function formatPeriod(from, to) {
  if (!from || !to) return '—';
  if (from === to) return formatDate(to, { short: true });
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return Number(from.slice(-2)) + '–' + formatDate(to, { short: true });
  }
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return formatDate(from, { short: true, year: !sameYear }) + ' – ' + formatDate(to, { short: true });
}

export function summarize(rows) {
  const provinces = new Map();
  const days = new Map();
  let unknownProvince = 0;
  for (const row of rows) {
    if (row.province) provinces.set(row.province, (provinces.get(row.province) ?? 0) + 1);
    else unknownProvince++;
    if (row.date) days.set(row.date, (days.get(row.date) ?? 0) + 1);
  }
  const dayTotals = [...days].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  return {
    total: rows.length,
    provinceCount: provinces.size,
    unknownProvince,
    dateFrom: dayTotals[0]?.date ?? '',
    dateTo: dayTotals.at(-1)?.date ?? '',
    provinces: [...provinces].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || regions.compare(a.name, b.name)),
    days: dayTotals,
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function graphic(tag, attrs, text) {
  const node = document.createElementNS(svgNamespace, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function isoDay(milliseconds) {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

// Use equal-duration UTC intervals even when a file omits dates. Cap the number
// of drawn points for long histories without dropping any observations.
function chartBuckets(summary) {
  const start = Date.parse(summary.dateFrom + 'T00:00:00Z');
  const end = Date.parse(summary.dateTo + 'T00:00:00Z');
  const days = (end - start) / dayMillis + 1;
  const interval = Math.ceil(days / 40);
  const size = Math.ceil(days / interval);
  const buckets = Array.from({ length: size }, (_, index) => {
    const from = start + index * interval * dayMillis;
    return { date: isoDay(from), end: isoDay(Math.min(end, from + (interval - 1) * dayMillis)), count: 0 };
  });
  for (const day of summary.days) {
    const offset = (Date.parse(day.date + 'T00:00:00Z') - start) / dayMillis;
    buckets[Math.floor(offset / interval)].count += day.count;
  }
  return { buckets, interval };
}

function axisStep(peak) {
  const raw = Math.max(1, peak / 3);
  const unit = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].find(multiplier => multiplier * unit >= raw) * unit;
}

export function renderTrend(container, summary) {
  if (!summary.days.length) {
    container.replaceChildren(element('p', 'stats-empty', 'Belum ada deteksi dalam rentang ini.'));
    return;
  }
  const { buckets, interval } = chartBuckets(summary);
  const peak = Math.max(...buckets.map(bucket => bucket.count));
  const step = axisStep(peak);
  const max = Math.ceil(peak / step) * step;
  const left = Math.max(27, formatNumber(max).length * 6 + 9);
  const right = 307;
  const top = 11;
  const bottom = 92;
  const x = index => buckets.length === 1 ? (left + right) / 2 : left + (right - left) * index / (buckets.length - 1);
  const y = value => bottom - (bottom - top) * value / max;

  const uid = 'karhutla-trend-' + (++chartId);
  const svg = graphic('svg', {
    viewBox: '0 0 312 114', width: '100%', role: 'img', 'aria-labelledby': uid + '-title',
    'aria-describedby': uid + '-description', style: 'display:block;overflow:visible',
  });
  svg.append(graphic('title', { id: uid + '-title' }, 'Tren deteksi hotspot'));
  const intervalNote = interval > 1 ? 'Jumlah deteksi per ' + formatNumber(interval) + ' hari.' : 'Jumlah deteksi per hari.';
  svg.append(graphic('desc', { id: uid + '-description' },
    intervalNote + ' ' + formatPeriod(summary.dateFrom, summary.dateTo) + '. Total ' + formatNumber(summary.total) + ' deteksi.'));
  const defs = graphic('defs', {});
  const shade = graphic('linearGradient', { id: uid, x1: '0', y1: '0', x2: '0', y2: '1' });
  shade.append(graphic('stop', { offset: '0', 'stop-color': '#f07135', 'stop-opacity': '0.24' }));
  shade.append(graphic('stop', { offset: '1', 'stop-color': '#f07135', 'stop-opacity': '0.025' }));
  defs.append(shade);
  svg.append(defs);
  const label = (px, py, anchor, text) => graphic('text', {
    x: px, y: py, 'text-anchor': anchor, fill: '#56677a', 'font-size': '10', 'font-family': 'inherit',
  }, text);
  for (let tick = 0; tick <= max; tick += step) {
    const py = y(tick);
    svg.append(graphic('line', {
      x1: left, x2: right, y1: py, y2: py, stroke: '#dce3e9', 'stroke-dasharray': '3 4',
    }), label(left - 6, py + 3, 'end', formatNumber(tick)));
  }

  const positions = buckets.map((bucket, index) => [x(index), y(bucket.count)]);
  const line = positions.map(([px, py], index) => (index ? 'L' : 'M') + px + ',' + py).join(' ');
  svg.append(graphic('path', {
    d: line + ' L' + positions.at(-1)[0] + ',' + bottom + ' L' + positions[0][0] + ',' + bottom + ' Z',
    fill: 'url(#' + uid + ')',
  }));
  svg.append(graphic('path', {
    d: line, fill: 'none', stroke: '#f07135', 'stroke-width': '2.4', 'stroke-linejoin': 'round',
    'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke',
  }));
  positions.forEach(([px, py], index) => {
    const group = graphic('g', {});
    const bucket = buckets[index];
    group.append(graphic('title', {}, formatPeriod(bucket.date, bucket.end) + ' · ' + formatNumber(bucket.count) + ' deteksi'));
    if (positions.length <= 15) {
      group.append(graphic('circle', { cx: px, cy: py, r: 2.7, fill: '#f07135', stroke: '#fff', 'stroke-width': 1 }));
    }
    group.append(graphic('circle', { cx: px, cy: py, r: 6, fill: 'transparent' }));
    svg.append(group);
  });
  const labelIndices = buckets.length <= 4 ? buckets.map((_, index) => index)
    : [0, Math.round((buckets.length - 1) / 3), Math.round((buckets.length - 1) * 2 / 3), buckets.length - 1];
  const multiYear = summary.dateFrom.slice(0, 4) !== summary.dateTo.slice(0, 4);
  for (const index of labelIndices) {
    const anchor = labelIndices.length === 1 ? 'middle' : index === 0 ? 'start' : index === buckets.length - 1 ? 'end' : 'middle';
    svg.append(label(x(index), 110, anchor, formatDate(buckets[index].date, { short: true, year: multiYear })));
  }
  container.replaceChildren(svg);
  if (interval > 1) container.append(element('p', 'stats-note', intervalNote));
}

export function renderProvinces(container, summary, { limit = 5 } = {}) {
  const list = element('ol', 'province-list');
  for (const { name, count } of summary.provinces.slice(0, limit)) {
    const item = element('li', 'province-item');
    const head = element('div', 'province-row');
    head.append(element('span', 'province-name', name), element('strong', 'province-value', formatNumber(count)));
    const track = element('div', 'province-track');
    track.setAttribute('aria-hidden', 'true');
    const bar = element('div', 'province-fill');
    bar.style.width = (count * 100 / summary.provinces[0].count) + '%';
    track.append(bar);
    item.append(head, track);
    list.append(item);
  }
  container.replaceChildren();
  if (list.children.length) container.append(list);
  else if (!summary.unknownProvince) container.append(element('p', 'stats-empty', 'Belum ada provinsi dengan deteksi.'));
  if (summary.unknownProvince) container.append(element('p', 'stats-note',
    formatNumber(summary.unknownProvince) + ' deteksi tanpa informasi provinsi.'));
}

function tablePanel(title, heading, records) {
  const panel = element('section', 'stats-table-panel');
  panel.append(element('h3', '', title));
  if (!records.length) {
    panel.append(element('p', 'stats-empty', 'Tidak ada data untuk filter ini.'));
    return panel;
  }
  const table = element('table', 'stats-table');
  table.setAttribute('aria-label', title);
  const thead = table.createTHead();
  const header = thead.insertRow();
  for (const label of [heading, 'Deteksi']) {
    const th = element('th', '', label);
    th.scope = 'col';
    header.append(th);
  }
  const tbody = table.createTBody();
  panel.append(table);
  let page = 0;
  const perPage = 12;
  const pages = Math.ceil(records.length / perPage);
  const controls = element('div', 'stats-pagination');
  const previous = element('button', '', 'Sebelumnya');
  const next = element('button', '', 'Berikutnya');
  previous.type = next.type = 'button';
  const status = element('span', 'stats-note');
  status.setAttribute('aria-live', 'polite');
  function drawPage() {
    tbody.replaceChildren();
    for (const [label, count] of records.slice(page * perPage, (page + 1) * perPage)) {
      const row = tbody.insertRow();
      row.insertCell().textContent = label;
      row.insertCell().textContent = formatNumber(count);
    }
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    status.textContent = formatNumber(page + 1) + ' / ' + formatNumber(pages);
  }
  if (pages > 1) {
    previous.addEventListener('click', () => { page--; drawPage(); });
    next.addEventListener('click', () => { page++; drawPage(); });
    controls.append(previous, status, next);
    panel.append(controls);
  }
  drawPage();
  return panel;
}

export function renderStatsTables(container, summary) {
  const provinces = summary.provinces.map(({ name, count }) => [name, count]);
  if (summary.unknownProvince) provinces.push(['Tanpa informasi provinsi', summary.unknownProvince]);
  const days = summary.days.map(({ date, count }) => [formatDate(date, { short: true }), count]).reverse();
  container.replaceChildren(
    tablePanel('Deteksi menurut provinsi', 'Provinsi', provinces),
    tablePanel('Deteksi menurut tanggal', 'Tanggal (UTC)', days),
  );
}
