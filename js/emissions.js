import { byId } from './ui.js';
import { formatNumber } from './statistics.js';

const emissionUrl = new URL('../data/emisiCO2.csv', import.meta.url);
const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

let emissionRows = [];
let loaded = false;

function parseIndoNumber(val) {
  if (val == null) return 0;
  const cleaned = String(val).trim().replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

const decimalFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatEmission(num) {
  return decimalFormatter.format(num);
}

export async function initEmissions() {
  if (loaded) {
    renderEmissionView();
    return;
  }

  try {
    const response = await fetch(emissionUrl);
    if (!response.ok) throw new Error('Gagal memuat data/emisiCO2.csv');
    const text = (await response.text()).replace(/^\uFEFF/, '');

    if (!globalThis.Papa) throw new Error('PapaParse belum siap.');
    const parsed = globalThis.Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    emissionRows = parsed.data
      .filter((row) => {
        const name = (row.Provinsi || '').trim();
        return name !== '' && !/^total$/i.test(name);
      })
      .map((row) => {
        const values = {};
        let total = 0;
        for (const y of YEARS) {
          const val = parseIndoNumber(row[y]);
          values[y] = val;
          total += val;
        }
        return {
          province: row.Provinsi.trim(),
          values,
          total,
        };
      });

    loaded = true;
    wireEmissionControls();
    renderEmissionView();
  } catch (err) {
    const tbody = byId('emisi-table-body');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="11">${err.message}</td></tr>`;
    }
  }
}

function wireEmissionControls() {
  const yearSelect = byId('emisi-year');
  const searchInput = byId('emisi-search');
  const resetBtn = byId('emisi-reset');

  if (yearSelect && yearSelect.options.length <= 1) {
    for (const y of [...YEARS].reverse()) {
      yearSelect.append(new Option('Tahun ' + y, y));
    }
  }

  yearSelect?.addEventListener('change', renderEmissionView);
  searchInput?.addEventListener('input', renderEmissionView);
  resetBtn?.addEventListener('click', () => {
    if (yearSelect) yearSelect.value = '';
    if (searchInput) searchInput.value = '';
    renderEmissionView();
  });
}

export function renderEmissionView() {
  if (!loaded) return;

  const selectedYear = byId('emisi-year')?.value || '';
  const query = (byId('emisi-search')?.value || '').trim().toLowerCase();

  const filteredProvinces = emissionRows.filter((row) =>
    row.province.toLowerCase().includes(query),
  );

  const computed = filteredProvinces.map((row) => ({
    province: row.province,
    values: row.values,
    activeValue: selectedYear ? row.values[selectedYear] : row.total,
  }));

  const sorted = [...computed].sort((a, b) => b.activeValue - a.activeValue);

  const totalEmission = sorted.reduce((sum, r) => sum + r.activeValue, 0);
  const topProvince = sorted[0];
  const activeCount = sorted.filter((r) => r.activeValue > 0).length;
  const avgEmission = activeCount ? totalEmission / activeCount : 0;

  const elTotal = byId('emisi-metric-total');
  const elTopVal = byId('emisi-metric-top-val');
  const elTopLabel = byId('emisi-metric-top-label');
  const elAvg = byId('emisi-metric-avg');
  const elPeriod = byId('emisi-metric-period');

  if (elTotal) elTotal.textContent = formatEmission(totalEmission);
  if (elTopVal) {
    elTopVal.textContent =
      topProvince && topProvince.activeValue > 0 ? formatEmission(topProvince.activeValue) : '—';
  }
  if (elTopLabel) {
    elTopLabel.textContent =
      topProvince && topProvince.activeValue > 0
        ? 'Tertinggi · ' + topProvince.province
        : 'Provinsi tertinggi';
  }
  if (elAvg) elAvg.textContent = formatEmission(avgEmission);
  if (elPeriod) elPeriod.textContent = selectedYear ? 'Tahun ' + selectedYear : '2018–2026';

  renderYearlyTrend(filteredProvinces, selectedYear);
  renderTopEmissionProvinces(sorted.slice(0, 10));
  renderEmissionTable(sorted, selectedYear);
}

function renderYearlyTrend(rows, selectedYear) {
  const container = byId('emisi-trend-chart');
  if (!container) return;

  const yearlyTotals = YEARS.map((year) => ({
    year,
    total: rows.reduce((sum, r) => sum + r.values[year], 0),
  }));

  const maxVal = Math.max(...yearlyTotals.map((d) => d.total), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:10px;height:190px;padding-top:24px;">
      ${yearlyTotals
        .map((d) => {
          const pct = Math.max(4, Math.round((d.total / maxVal) * 100));
          const isSelected = selectedYear === d.year;
          const barColor = !selectedYear || isSelected ? '#e77741' : '#cbd5e1';
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;" title="Tahun ${d.year}: ${formatEmission(d.total)}">
              <span style="font-size:11px;color:#64748b;font-weight:600;">${d.total >= 1000000 ? (d.total / 1000000).toFixed(1) + 'jt' : d.total >= 1000 ? Math.round(d.total / 1000) + 'rb' : Math.round(d.total)}</span>
              <div style="width:100%;max-width:34px;height:${pct}%;background:${barColor};border-radius:6px 6px 2px 2px;transition:height .25s;"></div>
              <span style="font-size:12px;font-weight:${isSelected ? '700' : '500'};color:${isSelected ? '#14253a' : '#475569'};">${d.year}</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderTopEmissionProvinces(topRows) {
  const container = byId('emisi-province-chart');
  if (!container) return;

  const valid = topRows.filter((r) => r.activeValue > 0);
  if (!valid.length) {
    container.innerHTML = '<p style="color:#64748b;padding:1rem 0;">Tidak ada data emisi untuk filter ini.</p>';
    return;
  }

  const maxVal = Math.max(...valid.map((r) => r.activeValue), 1);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;padding-top:6px;">
      ${valid
        .map((r) => {
          const pct = Math.max(2, (r.activeValue / maxVal) * 100).toFixed(1);
          return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span style="font-weight:600;color:#14253a;">${r.province}</span>
                <span style="font-variant-numeric:tabular-nums;color:#475569;">${formatEmission(r.activeValue)}</span>
              </div>
              <div style="height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:#e77741;border-radius:999px;"></div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderEmissionTable(rows, selectedYear) {
  const tbody = byId('emisi-table-body');
  const countPill = byId('emisi-count');
  if (!tbody) return;

  if (countPill) countPill.textContent = formatNumber(rows.length) + ' provinsi';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11">Provinsi tidak ditemukan.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td style="font-weight:600;white-space:nowrap;">${r.province}</td>
        ${YEARS.map(
          (y) =>
            `<td style="text-align:right;font-variant-numeric:tabular-nums;${selectedYear === y ? 'background:#fff7ed;font-weight:700;' : ''}">${formatEmission(r.values[y])}</td>`,
        ).join('')}
        <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${formatEmission(r.activeValue)}</td>
      </tr>
    `,
    )
    .join('');
}