import { formatDate, formatNumber } from './statistics.js';

const ns = 'http://www.w3.org/2000/svg';
export const byId = (id) => document.getElementById(id);

export function icon(name) {
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', './assets/icons.svg#' + name);
  svg.append(use);
  return svg;
}

export function installIcons() {
  document.querySelectorAll('i[data-icon]').forEach((node) => node.replaceWith(icon(node.dataset.icon)));
}

export function setOptions(select, values, allLabel) {
  const options = [new Option(allLabel, ''), ...values.map((value) => new Option(value, value))];
  select.replaceChildren(...options);
}

let toastTimer;
export function notify(message) {
  const toast = byId('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 5500);
}

export function showStatus(text, state) {
  byId('status-label').textContent = text;
  byId('system-status').dataset.state = state;
}

export function showNotice(text) {
  const notice = byId('dataset-message');
  notice.textContent = text;
  notice.hidden = !text;
}

export function drawSparkline(days) {
  const svg = byId('mini-trend');
  svg.replaceChildren();
  if (days.length < 2) return;
  const stride = Math.max(1, Math.ceil(days.length / 45));
  const sample = days.filter((_, i) => i % stride === 0 || i === days.length - 1);
  const peak = Math.max(...sample.map((day) => day.count));
  const points = sample.map(
    (day, i) =>
      (1 + (92 * i) / (sample.length - 1)).toFixed(1) + ',' + (27 - (23 * day.count) / peak).toFixed(1),
  );
  const path = document.createElementNS(ns, 'path');
  const line = 'M' + points.join(' L');
  path.setAttribute('d', line + ' V29 H1 Z');
  path.setAttribute('fill', '#fff0e7');
  const stroke = document.createElementNS(ns, 'path');
  stroke.setAttribute('d', line);
  stroke.setAttribute('fill', 'none');
  stroke.setAttribute('stroke', '#e77741');
  stroke.setAttribute('stroke-width', '2');
  svg.append(path, stroke);
}

const decimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 });
export function renderRecords(rows, page, pageSize) {
  const tbody = byId('records-body');
  const start = page * pageSize;
  const end = Math.min(start + pageSize, rows.length);
  const fragment = document.createDocumentFragment();
  for (let i = start; i < end; i++) {
    const row = rows[i];
    const tr = document.createElement('tr');
    const cell = (value) => {
      const td = tr.insertCell();
      td.textContent = value;
      return td;
    };
    const dateCell = cell(formatDate(row.date, { short: true }));
    if (row.time) dateCell.title = row.time + ' UTC';
    cell(row.province || 'Belum diketahui');
    const satellite = document.createElement('span');
    satellite.className = 'satellite-cell';
    satellite.append(icon('satellite'), document.createTextNode(row.satellite || '—'));
    tr.insertCell().append(satellite);
    const confidenceCell = tr.insertCell();
    if (row.confidence) {
      const badge = document.createElement('span');
      badge.className = 'confidence-badge';
      badge.textContent = row.confidence;
      badge.dataset.type = row.confidence.toLocaleLowerCase('id-ID');
      confidenceCell.append(badge);
    } else confidenceCell.textContent = '—';
    cell(row.frp == null ? '—' : decimal.format(row.frp));
    cell(row.latitude.toFixed(4) + ', ' + row.longitude.toFixed(4)).className = 'coordinate';
    fragment.append(tr);
  }
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = tr.insertCell();
    td.colSpan = 6;
    td.textContent = 'Tidak ada pengamatan untuk ditampilkan.';
    fragment.append(tr);
  }
  tbody.replaceChildren(fragment);
  byId('records-count').textContent = formatNumber(rows.length) + ' baris';
  byId('page-info').textContent = rows.length
    ? formatNumber(start + 1) + '–' + formatNumber(end) + ' dari ' + formatNumber(rows.length) + ' pengamatan'
    : '0 pengamatan';
  byId('prev-page').disabled = start === 0;
  byId('next-page').disabled = end >= rows.length;
}

export function togglePopover(button, panel, open) {
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
}

export function wirePopover(button, panel) {
  button.addEventListener('click', () => togglePopover(button, panel, panel.hidden));
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target))
      togglePopover(button, panel, false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      togglePopover(button, panel, false);
      button.focus();
    }
  });
}
