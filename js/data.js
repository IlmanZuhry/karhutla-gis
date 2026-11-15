const datasetUrl = new URL('../data/sample-hotspots.csv', import.meta.url);
const provincesUrl = new URL('../data/provinces.geojson', import.meta.url);

let boundaryRequest;

function clean(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function key(value) {
  return clean(value).toLowerCase().replace(/^\uFEFF/, '').replace(/[\s-]+/g, '_');
}

function decimal(value) {
  const text = clean(value);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value) {
  const date = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const ms = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date ? date : '';
}

function parseTime(value) {
  const text = clean(value);
  let digits;
  if (/^\d{1,4}$/.test(text)) digits = text.padStart(4, '0');
  else if (/^\d{2}:\d{2}$/.test(text)) digits = text.replace(':', '');
  else return '';
  const hours = digits.slice(0, 2), minutes = digits.slice(2);
  return Number(hours) < 24 && Number(minutes) < 60 ? hours + ':' + minutes : '';
}

function platformName(value) {
  const raw = clean(value);
  const names = { n: 'Suomi NPP', np: 'Suomi NPP', 'suomi-npp': 'Suomi NPP',
    snpp: 'Suomi NPP', n20: 'NOAA-20', j1: 'NOAA-20', n21: 'NOAA-21', j2: 'NOAA-21',
    terra: 'Terra', t: 'Terra', aqua: 'Aqua', a: 'Aqua' };
  return Object.hasOwn(names, raw.toLowerCase()) ? names[raw.toLowerCase()] : raw;
}

function confidenceLabel(raw, satellite, instrument) {
  if (!raw) return '';
  const sensor = instrument.toUpperCase();
  if (sensor === 'VIIRS' || (!sensor && /^(NOAA-2[01]|Suomi NPP)$/i.test(satellite))) {
    const classes = { l: 'Rendah', low: 'Rendah', n: 'Nominal', nominal: 'Nominal',
      h: 'Tinggi', high: 'Tinggi' };
    return Object.hasOwn(classes, raw.toLowerCase()) ? classes[raw.toLowerCase()] : '';
  }
  if (sensor === 'MODIS' || (!sensor && /^(Terra|Aqua)$/i.test(satellite))) {
    const value = decimal(raw);
    if (value === null || value < 0 || value > 100) return '';
    return value < 30 ? 'Rendah' : value < 80 ? 'Nominal' : 'Tinggi';
  }
  return raw;
}

// -1 marks the boundary; 0 is outside; 1 is inside. Keep shared edges unassigned.
function ringPosition(x, y, ring) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) continue;
    const cross = (x - ax) * dy - (y - ay) * dx;
    if (Math.abs(cross) <= 1e-12 * Math.max(Math.abs(dx), Math.abs(dy)) &&
        x >= Math.min(ax, bx) && x <= Math.max(ax, bx) &&
        y >= Math.min(ay, by) && y <= Math.max(ay, by)) return -1;
    if ((ay > y) !== (by > y) && x < ax + dx * (y - ay) / dy) inside = !inside;
  }
  return inside ? 1 : 0;
}

// Prepare one bounding box per polygon, including separate island parts. Boxes only
// eliminate candidates. Every match still has to pass its exterior and hole tests.
export function createProvinceLookup(collection) {
  const polygons = [];
  for (const feature of collection.features) {
    const { type, coordinates } = feature.geometry;
    const parts = type === 'MultiPolygon' ? coordinates : type === 'Polygon' ? [coordinates] : [];
    for (const rings of parts) {
      const box = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of rings[0]) {
        box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      }
      polygons.push({ name: feature.properties.PROVINSI, rings, box });
    }
  }
  return (x, y) => {
    let match = '';
    for (const { name, rings, box } of polygons) {
      if (x < box[0] || y < box[1] || x > box[2] || y > box[3]) continue;
      const exterior = ringPosition(x, y, rings[0]);
      if (exterior === -1) return '';
      if (!exterior) continue;
      let inHole = false;
      for (let h = 1; h < rings.length; h++) {
        const hole = ringPosition(x, y, rings[h]);
        if (hole === -1) return '';
        if (hole === 1) { inHole = true; break; }
      }
      if (inHole) continue;
      if (match && match !== name) return '';
      match = name;
    }
    return match;
  };
}

async function getLookup() {
  if (!boundaryRequest) {
    boundaryRequest = fetch(provincesUrl).then(response => {
      if (!response.ok) throw new Error('Batas provinsi gagal dimuat.');
      return response.json();
    }).then(createProvinceLookup).catch(() => {
      boundaryRequest = undefined;
      return null;
    });
  }
  return boundaryRequest;
}

function csvRecords(text) {
  if (!globalThis.Papa) throw new Error('Pembaca CSV belum tersedia. Muat ulang halaman atau gunakan GeoJSON.');
  const result = globalThis.Papa.parse(text, { header: true, transformHeader: key,
    skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t'] });
  const columns = result.meta.fields || [];
  if (!columns.some(c => ['latitude', 'lat'].includes(c)) ||
      !columns.some(c => ['longitude', 'lon', 'lng'].includes(c)) ||
      !columns.some(c => ['acq_date', 'date', 'tanggal'].includes(c))) {
    throw new Error('CSV memerlukan kolom latitude, longitude, dan acq_date (YYYY-MM-DD).');
  }
  if (Object.keys(result.meta.renamedHeaders || {}).length || new Set(columns).size !== columns.length) {
    throw new Error('Nama kolom CSV harus unik. Periksa header yang berulang.');
  }
  if (result.errors.some(error => error.type === 'Quotes')) {
    throw new Error('Tanda kutip CSV tidak berpasangan. Periksa file lalu impor kembali.');
  }
  const badRows = new Set(result.errors.filter(e => e.type === 'FieldMismatch').map(e => e.row));
  return result.data.map((record, i) => badRows.has(i) ? null : record);
}

function geojsonRecords(text) {
  let input;
  try { input = JSON.parse(text); }
  catch { throw new Error('Isi file bukan JSON yang valid.'); }
  if (input?.type !== 'Feature' && !(input?.type === 'FeatureCollection' && Array.isArray(input.features))) {
    throw new Error('Gunakan GeoJSON Feature atau FeatureCollection berisi Point WGS84.');
  }
  if (input.crs && !/(?:CRS84|EPSG(?::|::|\/0\/)4326)$/i.test(clean(input.crs.properties?.name))) {
    throw new Error('Proyeksikan GeoJSON ke WGS84 (EPSG:4326, bujur dan lintang) sebelum mengimpor.');
  }
  const features = input.type === 'Feature' ? [input] : input.features;
  return features.map(feature => {
    const geometry = feature?.geometry;
    if (feature?.type !== 'Feature' || geometry?.type !== 'Point' ||
        !Array.isArray(geometry.coordinates) || !Number.isFinite(geometry.coordinates[0]) ||
        !Number.isFinite(geometry.coordinates[1])) return null;
    const props = Object.fromEntries(Object.entries(feature.properties || {}).map(([name, value]) => [key(name), value]));
    return { ...props, longitude: geometry.coordinates[0], latitude: geometry.coordinates[1] };
  });
}

function first(record, ...keys) {
  for (const k of keys) {
    const value = clean(record[k]);
    if (value) return value;
  }
  return '';
}

async function normalize(records, label, source, imported) {
  const warnings = [];
  let rejected = 0, optionalIssues = 0, unknownProvince = 0, isDemo = false;
  const needsLookup = records.some(r => r && !first(r, 'province', 'provinsi'));
  const locate = needsLookup ? await getLookup() : null;
  if (needsLookup && !locate) warnings.push('Batas provinsi gagal dimuat. Baris tanpa atribut provinsi tetap dapat dipetakan.');
  const rows = [];
  for (let index = 0; index < records.length; index++) {
    if (index > 0 && index % 2000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    const record = records[index];
    if (!record) { rejected++; continue; }
    const latitude = decimal(first(record, 'latitude', 'lat'));
    const longitude = decimal(first(record, 'longitude', 'lon', 'lng'));
    const date = parseDate(first(record, 'acq_date', 'date', 'tanggal'));
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !date) {
      rejected++;
      continue;
    }
    const providedProvince = first(record, 'province', 'provinsi');
    const province = providedProvince || locate?.(longitude, latitude) || '';
    const provinceMethod = first(record, 'province_method') || (providedProvince ? 'atribut' : province ? 'poligon' : '');
    if (!province) unknownProvince++;
    const satellite = platformName(first(record, 'satellite', 'satelit'));
    const instrument = first(record, 'instrument', 'sensor');
    const confidenceRaw = first(record, 'confidence', 'kepercayaan');
    const confidence = confidenceLabel(confidenceRaw, satellite, instrument);
    const timeText = first(record, 'acq_time', 'time', 'waktu'), time = parseTime(timeText);
    const frpText = first(record, 'frp'), frpValue = decimal(frpText);
    const brightText = first(record, 'bright_ti4', 'brightness'), brightValue = decimal(brightText);
    const frp = frpValue !== null && frpValue >= 0 ? frpValue : null;
    const brightness = brightValue !== null && brightValue > 0 ? brightValue : null;
    if ((frpText && frp === null) || (brightText && brightness === null) ||
        (timeText && !time) || (confidenceRaw && !confidence)) optionalIssues++;
    const demoRow = /^data demo$/i.test(first(record, 'data_status', 'status_data'));
    if (demoRow) isDemo = true;
    rows.push({ latitude, longitude, date, time, satellite, instrument, confidenceRaw,
      confidence, frp, brightness, province, provinceMethod,
      region: first(record, 'region', 'kabupaten', 'kota', 'district', 'city'),
      isDemo: demoRow, source: demoRow ? 'DATA DEMO' : first(record, 'source', 'sumber') || (imported ? label : source) });
  }
  if (rejected) warnings.push(rejected.toLocaleString('id-ID') + ' baris dilewati karena struktur, koordinat, atau tanggal tidak valid.');
  if (optionalIssues) warnings.push(optionalIssues.toLocaleString('id-ID') + ' baris memiliki waktu, confidence, atau angka opsional yang tidak valid. Atribut terolah tersebut dikosongkan.');
  if (unknownProvince) warnings.push(unknownProvince.toLocaleString('id-ID') + ' deteksi tanpa provinsi teridentifikasi.');
  return { rows, source: isDemo ? 'DATA DEMO' : source, label, isDemo, rejected, warnings };
}

export async function loadInitialDataset() {
  const response = await fetch(datasetUrl);
  if (!response.ok) throw new Error('Arsip pengamatan gagal dimuat. Impor CSV atau GeoJSON untuk memulai.');
  return normalize(csvRecords(await response.text()), 'VIIRS NOAA-20 & NOAA-21', 'NASA FIRMS', false);
}

export async function importDataset(file) {
  if (!file || typeof file.text !== 'function') throw new Error('Pilih file CSV atau GeoJSON.');
  const name = file.name || 'Berkas lokal';
  const extension = name.split('.').pop().toLowerCase();
  if (!['csv', 'geojson', 'json'].includes(extension)) throw new Error('Format yang didukung adalah CSV, GeoJSON, atau JSON.');
  let content;
  try { content = (await file.text()).replace(/^\uFEFF/, ''); }
  catch { throw new Error('File tidak dapat dibaca. Pilih kembali file dari perangkat Anda.'); }
  if (!content.trim()) throw new Error('File kosong. Pilih CSV dengan header dan data pengamatan, atau GeoJSON Point.');
  return normalize(extension === 'csv' ? csvRecords(content) : geojsonRecords(content), name, 'Impor lokal', true);
}

export function exportCsv(rows) {
  if (!rows.length) throw new Error('Belum ada deteksi untuk diekspor.');
  if (!globalThis.Papa) throw new Error('Pengekspor CSV belum tersedia. Muat ulang halaman.');
  const data = rows.map(row => ({
    latitude: row.latitude, longitude: row.longitude, acq_date: row.date, acq_time: row.time.replace(':', ''),
    satellite: row.satellite, instrument: row.instrument, confidence: row.confidenceRaw,
    frp: row.frp, brightness: row.brightness, province: row.province, province_method: row.provinceMethod,
    region: row.region, source: row.source, data_status: row.isDemo ? 'DATA DEMO' : ''
  }));
  const csv = globalThis.Papa.unparse(data, { escapeFormulae: true, newline: '\r\n' });
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'karhutla-hasil-filter.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
