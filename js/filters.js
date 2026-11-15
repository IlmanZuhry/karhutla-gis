const collator = new Intl.Collator('id-ID', { numeric: true, sensitivity: 'base' });
const confidenceOrder = ['Rendah', 'Nominal', 'Tinggi'];

export function emptyFilters() {
  return { province: '', dateFrom: '', dateTo: '', confidence: '', satellite: '', query: '' };
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('id-ID');
}

export function applyFilters(rows, filters = {}) {
  const terms = normalizeText(filters.query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    if (filters.province && row.province !== filters.province) return false;
    if (filters.confidence && row.confidence !== filters.confidence) return false;
    if (filters.satellite && row.satellite !== filters.satellite) return false;
    if (filters.dateFrom && (!row.date || row.date < filters.dateFrom)) return false;
    if (filters.dateTo && (!row.date || row.date > filters.dateTo)) return false;
    if (!terms.length) return true;
    const region = normalizeText([row.province, row.region].filter(Boolean).join(' '));
    return terms.every(term => region.includes(term));
  });
}

export function filterOptions(rows) {
  const provinces = new Set();
  const confidences = new Set();
  const satellites = new Set();
  let minDate = '';
  let maxDate = '';
  for (const row of rows) {
    if (row.province) provinces.add(row.province);
    if (row.confidence) confidences.add(row.confidence);
    if (row.satellite) satellites.add(row.satellite);
    if (row.date && (!minDate || row.date < minDate)) minDate = row.date;
    if (row.date && row.date > maxDate) maxDate = row.date;
  }
  const rank = confidence => {
    const index = confidenceOrder.indexOf(confidence);
    return index < 0 ? confidenceOrder.length : index;
  };
  return {
    provinces: [...provinces].sort(collator.compare),
    confidences: [...confidences].sort((a, b) => rank(a) - rank(b) || collator.compare(a, b)),
    satellites: [...satellites].sort(collator.compare),
    minDate,
    maxDate,
  };
}

export function activeFilterCount(filters = {}) {
  return Object.keys(emptyFilters()).filter(key => String(filters[key] ?? '').trim()).length;
}
