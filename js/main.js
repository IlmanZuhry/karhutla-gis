import { loadInitialDataset, importDataset, exportCsv } from './data.js';
import { applyFilters, activeFilterCount, filterOptions } from './filters.js';
import {
  summarize,
  formatNumber,
  formatPeriod,
  renderTrend,
  renderProvinces,
  renderStatsTables,
} from './statistics.js';
import { createHotspotMap } from './map.js';
import { initEmissions } from './emissions.js';
import { initRegulations } from './regulations.js';
import {
  byId,
  installIcons,
  icon,
  notify,
  showNotice,
  showStatus,
  renderRecords,
  drawSparkline,
  setOptions,
  wirePopover,
  togglePopover,
} from './ui.js';

const views = {
  dashboard: [
    'Dashboard',
    'Dashboard pemantauan',
    'Pantau persebaran titik panas dari pengamatan satelit di Indonesia.',
  ],
  statistik: [
    'Analisis statistik',
    'Analisis statistik',
    'Telusuri tren pengamatan dan distribusi deteksi menurut provinsi.',
  ],
  dataset: [
    'Dataset',
    'Dataset pengamatan',
    'Periksa sumber, atribut, dan baris pengamatan yang sesuai dengan filter.',
  ],
  emisi: [
    'Data emisi',
    'Data emisi CO₂',
    'Pantau estimasi emisi karbon dioksida (CO₂) karhutla per provinsi tahun 2018–2026.',
  ],
  'peta-tematik': [
    'Peta tematik',
    'Peta tematik & mitigasi',
    'Visualisasi kartografi hasil analisis spasial kerawanan karhutla dan zona prioritas penanganan.',
  ],
  peraturan: [
    'Peraturan perundangan',
    'Peraturan perundangan',
    'Kumpulan regulasi, undang-undang, dan keputusan terkait pengendalian kebakaran hutan dan lahan.',
  ],
  panduan: [
    'Panduan',
    'Panduan penggunaan',
    'Kenali data pengamatan satelit dan cara menggunakannya di peta.',
  ],
};
let dataset = { rows: [], label: '', source: '', warnings: [] };
let filtered = [];
let summary = summarize(filtered);
let page = 0;
let view = 'dashboard';
let map;
let mapPromise;
let mapError = '';
let librariesReady = false;
let generation = 0;
let loading = true;
let filterTimer;
let imported = false;
let fitNewDataset = false;
const dialog = byId('import-dialog');
const smallScreen = matchMedia('(max-width: 700px)');

function script(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => {
      tag.remove();
      reject(new Error('Gagal memuat ' + src));
    };
    document.head.append(tag);
  });
}

// Pages uses versioned CDN files. Live Server uses the matching local releases.
async function dependency(localFile, cdnPath) {
  if (location.hostname.endsWith('.github.io')) {
    try {
      await script('https://cdn.jsdelivr.net/npm/' + cdnPath);
      return;
    } catch {
      /* Continue with the bundled release. */
    }
  }
  await script('./assets/vendor/' + localFile);
}

function readFilters() {
  return {
    province: byId('province').value,
    satellite: byId('satellite').value,
    confidence: byId('confidence').value,
    dateFrom: byId('date-from').value,
    dateTo: byId('date-to').value,
    query: byId('region-query').value,
  };
}

function updateDates() {
  const from = byId('date-from'),
    to = byId('date-to');
  byId('date-button').querySelector('span').textContent =
    from.value && to.value
      ? formatPeriod(from.value, to.value)
      : from.value
        ? 'Mulai ' + from.value
        : to.value
          ? 'Hingga ' + to.value
          : 'Rentang tanggal';
}

function clearControls() {
  for (const id of ['province', 'satellite', 'confidence', 'date-from', 'date-to', 'region-query'])
    byId(id).value = '';
  updateDates();
}

function setMapMessage() {
  const empty = byId('map-empty');
  const text =
    mapError ||
    (loading
      ? 'Memuat pengamatan…'
      : !dataset.rows.length
        ? 'Impor CSV atau GeoJSON untuk menampilkan titik panas.'
        : !filtered.length
          ? 'Tidak ada deteksi yang sesuai. Ubah atau reset filter.'
          : !byId('show-hotspots').checked
            ? 'Layer titik panas disembunyikan.'
            : '');
  empty.textContent = text;
  empty.hidden = !text;
}

function renderAnalysis() {
  renderTrend(byId('detail-trend'), summary);
  renderProvinces(byId('detail-provinces'), summary, { limit: 10 });
  renderStatsTables(byId('stats-tables'), summary);
}

function renderPage() {
  renderRecords(filtered, page, view === 'dataset' ? 25 : 6);
}

function apply() {
  clearTimeout(filterTimer);
  filterTimer = undefined;
  const filters = readFilters();
  filtered = applyFilters(dataset.rows, filters);
  summary = summarize(filtered);
  page = 0;
  byId('metric-total').textContent = formatNumber(summary.total);
  byId('metric-provinces').textContent = formatNumber(summary.provinceCount);
  byId('metric-satellites').textContent = formatNumber(
    new Set(filtered.map((row) => row.satellite).filter(Boolean)).size,
  );
  byId('metric-period').textContent = formatPeriod(summary.dateFrom, summary.dateTo);
  byId('export-btn').disabled = !filtered.length || !globalThis.Papa;
  const count = activeFilterCount(filters);
  byId('filter-count').textContent = count ? '(' + count + ')' : '';
  drawSparkline(summary.days);
  renderTrend(byId('trend-chart'), summary);
  renderProvinces(byId('province-chart'), summary);
  if (view === 'statistik') renderAnalysis();
  renderPage();
  map?.setRows(filtered);
  setMapMessage();
}

async function ensureMap() {
  if (!librariesReady || view !== 'dashboard') return;
  if (!mapPromise) {
    mapPromise = createHotspotMap({
      element: byId('map'),
      onStatus: notify,
      onLayerChange: (name) => {
        document.querySelectorAll('input[name=basemap]').forEach((input) => {
          input.checked = input.value === name;
        });
      },
      onVisibilityChange: (value) => {
        byId('show-hotspots').checked = value;
        setMapMessage();
      },
      onMeasure: (message, active) => {
        byId('measurement').hidden = !message;
        byId('measurement').querySelector('span').textContent = message;
        byId('map-ruler').setAttribute('aria-pressed', String(active));
      },
    })
      .then((instance) => {
        map = instance;
        map.setRows(filtered);
        return map;
      })
      .catch((error) => {
        mapError = error.message;
        setMapMessage();
      });
  }
  await mapPromise;
  if (view === 'dashboard' && map) {
    map.invalidate();
    if (fitNewDataset && filtered.length) {
      map.fitFiltered();
      fitNewDataset = false;
    }
  }
}

function assignDataset(next, fromFile) {
  dataset = next;
  imported = fromFile;
  fitNewDataset = fromFile;
  const options = filterOptions(dataset.rows);
  setOptions(byId('province'), options.provinces, 'Semua provinsi');
  setOptions(byId('confidence'), options.confidences, 'Confidence');
  setOptions(byId('satellite'), options.satellites, 'Semua satelit');
  for (const id of ['date-from', 'date-to']) {
    byId(id).min = options.minDate;
    byId(id).max = options.maxDate;
  }
  clearControls();
  const attribution = fromFile ? (dataset.isDemo ? 'DATA DEMO' : 'Impor lokal') : dataset.source;
  byId('map-source').textContent = attribution;
  byId('file-label').textContent = dataset.label;
  byId('file-description').textContent = [
    attribution,
    formatNumber(dataset.rows.length) + ' pengamatan',
    formatPeriod(options.minDate, options.maxDate),
  ].join(' · ');
  byId('source-foot').textContent = 'Sumber data: ' + attribution + ' · ' + dataset.label;
  byId('restore-btn').disabled = !imported;
  showStatus(
    dataset.isDemo ? 'DATA DEMO' : dataset.rows.length ? 'Dataset aktif' : 'Dataset kosong',
    dataset.rows.length ? 'ready' : 'empty',
  );
  showNotice(dataset.warnings.join(' '));
  apply();
  if (view === 'dashboard' && map) {
    if (fromFile && filtered.length) {
      map.fitFiltered();
      fitNewDataset = false;
    } else map.fitIndonesia();
  }
}

function setLoading(message) {
  loading = true;
  showStatus(message, 'busy');
  setMapMessage();
}

async function selectDataset(file) {
  const token = ++generation;
  setLoading(file ? 'Memproses impor' : 'Memuat data');
  byId('import-state').textContent = file ? 'Memvalidasi ' + file.name + '…' : '';
  try {
    const next = file ? await importDataset(file) : await loadInitialDataset();
    if (token !== generation) return;
    if (file && !next.rows.length && dataset.rows.length) {
      throw new Error(
        next.rejected
          ? 'Semua baris ditolak. ' + next.warnings.join(' ')
          : 'Berkas tidak memiliki pengamatan. Pilih berkas yang berisi data.',
      );
    }
    loading = false;
    assignDataset(next, Boolean(file));
    if (dialog.open) dialog.close();
    if (file) notify(formatNumber(next.rows.length) + ' pengamatan dimuat dari ' + file.name + '.');
  } catch (error) {
    if (token !== generation) return;
    loading = false;
    const message = error.message || 'Dataset gagal dibaca. Pilih kembali berkas pengamatan.';
    if (file && dialog.open) byId('import-state').textContent = message;
    else showNotice(message);
    showStatus(
      dataset.isDemo ? 'DATA DEMO' : dataset.rows.length ? 'Dataset aktif' : 'Data belum tersedia',
      dataset.rows.length ? 'ready' : 'empty',
    );
    if (!dataset.rows.length) apply();
    setMapMessage();
  }
}

function setNav(open) {
  const visible = open && smallScreen.matches;
  byId('sidebar').classList.toggle('open', visible);
  byId('nav-scrim').hidden = !visible;
  document.querySelector('.workspace').inert = visible;
  byId('mobile-menu').setAttribute('aria-expanded', String(visible));
  if (smallScreen.matches) byId('sidebar').inert = !visible;
  else byId('sidebar').inert = false;
  if (visible) document.querySelector('.sidebar a[aria-current=page]')?.focus();
}

function expandMap(open) {
  byId('map-panel').classList.toggle('expanded', open);
  document.body.classList.toggle('lock-scroll', open);
  const button = byId('expand-map');
  const label = open ? 'Tutup peta diperbesar' : 'Perbesar panel peta';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.setAttribute('aria-pressed', String(open));
  button.replaceChildren(icon(open ? 'minimize2' : 'maximize2'));
  requestAnimationFrame(() => map?.invalidate());
}

function navigate() {
  const target = location.hash.slice(1);
  view = Object.hasOwn(views, target) ? target : 'dashboard';
  for (const name of Object.keys(views)) byId(name + '-view').hidden = name !== view;
  const [crumb, title, subtitle] = views[view];
  byId('page-title').textContent = title;
  byId('page-subtitle').textContent = subtitle;
  byId('crumb').textContent = crumb;
  const sectionLabel = view === 'peraturan' || view === 'panduan' ? 'Informasi' : 'Ruang kerja';
  document.querySelector('.breadcrumbs span').textContent = sectionLabel;
  document.title = title + ' · Karhutla GIS Indonesia';
  document.querySelectorAll('[data-view]').forEach((link) => {
    link.setAttribute('aria-label', views[link.dataset.view][0]);
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  for (const id of ['metrics', 'filters', 'heading-actions'])
    byId(id).hidden = view === 'panduan' || view === 'emisi' || view === 'peraturan' || view === 'peta-tematik';
  byId('records').hidden = view !== 'dashboard' && view !== 'dataset';
  byId('all-records').hidden = view === 'dataset';
  setNav(false);
  if (view !== 'dashboard' && byId('map-panel').classList.contains('expanded')) expandMap(false);
  if (view === 'statistik') renderAnalysis();
  if (view === 'emisi') {
    void initEmissions();
    byId('foot-note-text').textContent =
      'Nilai emisi merupakan estimasi akumulasi karbon dioksida (CO₂) akibat kebakaran hutan dan lahan.';
    byId('source-foot').textContent = 'Sumber data: SIPONGI KEMENHUT · Emisi CO₂ Karhutla (2018–2026)';
  } else if (view === 'peta-tematik') {
    byId('foot-note-text').textContent =
      'Peta tematik disusun menggunakan QGIS melalui analisis kepadatan titik panas dan buffer radius 16 km titik api ekstrem (>87°C).';
    byId('source-foot').textContent = 'Sumber data: NASA FIRMS, KLHK, & BIG (2026)';
  } else if (view === 'peraturan') {
    initRegulations();
    byId('foot-note-text').textContent =
      'Dokumen regulasi bersumber dari arsip peraturan perundangan pengendalian karhutla nasional.';
    byId('source-foot').textContent = 'Sumber data: SIPONGI KEMENHUT · Peraturan Perundangan';
  } else {
    byId('foot-note-text').textContent =
      'Hotspot mengindikasikan anomali panas. Konfirmasi kebakaran memerlukan verifikasi lapangan.';
    if (dataset.label) {
      const attribution = imported ? (dataset.isDemo ? 'DATA DEMO' : 'Impor lokal') : dataset.source;
      byId('source-foot').textContent = 'Sumber data: ' + attribution + ' · ' + dataset.label;
    }
  }
  page = 0;
  renderPage();
  window.scrollTo(0, 0);
  void ensureMap();
}

function wireControls() {
  document.querySelector('.skip').addEventListener('click', (event) => {
    event.preventDefault();
    byId('main').focus();
  });
  wirePopover(byId('date-button'), byId('date-panel'));
  wirePopover(byId('layer-button'), byId('layer-panel'));
  byId('mobile-menu').onclick = () => setNav(!byId('sidebar').classList.contains('open'));
  byId('nav-scrim').onclick = () => {
    setNav(false);
    byId('mobile-menu').focus();
  };
  byId('sidebar').addEventListener('click', (event) => {
    if (event.target.closest('a')) setNav(false);
  });
  smallScreen.addEventListener('change', () => setNav(false));
  window.addEventListener('hashchange', () => {
    navigate();
    byId('main').focus({ preventScroll: true });
  });
  byId('filter-toggle').onclick = () => {
    const open = byId('filter-fields').classList.toggle('open');
    byId('filter-toggle').setAttribute('aria-expanded', String(open));
  };
  for (const id of ['province', 'satellite', 'confidence']) byId(id).addEventListener('change', apply);
  byId('region-query').oninput = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(apply, 130);
  };
  for (const id of ['date-from', 'date-to']) {
    byId(id).onchange = () => {
      const from = byId('date-from'),
        to = byId('date-to');
      if (from.value && to.value && from.value > to.value) {
        if (id === 'date-from') to.value = from.value;
        else from.value = to.value;
        notify('Rentang disesuaikan ke tanggal yang baru dipilih.');
      }
      updateDates();
      apply();
    };
  }
  byId('clear-dates').onclick = () => {
    byId('date-from').value = byId('date-to').value = '';
    updateDates();
    apply();
  };
  byId('reset-filters').onclick = () => {
    clearControls();
    apply();
  };
  byId('export-btn').onclick = () => {
    try {
      if (filterTimer !== undefined) apply();
      exportCsv(filtered);
    } catch (error) {
      notify(error.message);
    }
  };
  byId('prev-page').onclick = () => {
    if (page > 0) {
      page--;
      renderPage();
    }
  };
  byId('next-page').onclick = () => {
    if ((page + 1) * (view === 'dataset' ? 25 : 6) < filtered.length) {
      page++;
      renderPage();
    }
  };
  for (const button of document.querySelectorAll('[data-import]'))
    button.onclick = () => {
      byId('import-file').value = '';
      byId('import-state').textContent = '';
      dialog.showModal();
    };
  byId('close-import').onclick = () => dialog.close();
  byId('import-file').onchange = (event) => {
    if (event.target.files[0]) void selectDataset(event.target.files[0]);
  };
  const zone = byId('drop-zone');
  zone.ondragover = (event) => {
    event.preventDefault();
    zone.classList.add('over');
  };
  zone.ondragleave = () => zone.classList.remove('over');
  zone.ondrop = (event) => {
    event.preventDefault();
    zone.classList.remove('over');
    if (event.dataTransfer.files[0]) void selectDataset(event.dataTransfer.files[0]);
  };
  byId('restore-btn').onclick = () => void selectDataset(null);
  const controls = {
    'zoom-in': 'zoomIn',
    'zoom-out': 'zoomOut',
    'map-home': 'fitIndonesia',
    'map-fit': 'fitFiltered',
    'map-locate': 'locate',
    'map-ruler': 'toggleMeasure',
    'end-measure': 'clearMeasure',
  };
  for (const [id, action] of Object.entries(controls)) byId(id).onclick = () => map?.[action]();
  byId('expand-map').onclick = () => expandMap(!byId('map-panel').classList.contains('expanded'));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (byId('map-panel').classList.contains('expanded') && byId('layer-panel').hidden) expandMap(false);
    if (byId('sidebar').classList.contains('open')) {
      setNav(false);
      byId('mobile-menu').focus();
    }
  });
  byId('show-hotspots').onchange = (event) => map?.setHotspotsVisible(event.target.checked);
  byId('show-vulnerability').onchange = (event) => map?.setVulnerabilityVisible(event.target.checked);
  byId('show-buffer').onchange = (event) => map?.setBufferVisible(event.target.checked);
  for (const input of document.querySelectorAll('input[name=basemap]'))
    input.onchange = () => {
      map?.setBasemap(input.value);
      togglePopover(byId('layer-button'), byId('layer-panel'), false);
      byId('layer-button').focus();
    };
  byId('coverage-home').onclick = async () => {
    if (view !== 'dashboard') {
      location.hash = 'dashboard';
      navigate();
    }
    await ensureMap();
    setNav(false);
    map?.fitIndonesia();
    byId('map-panel').scrollIntoView({ block: 'nearest' });
  };
}

installIcons();
wireControls();
navigate();
showStatus('Memuat data', 'busy');
setMapMessage();
const dataReady = dependency('papaparse.min.js', 'papaparse@5.5.3/papaparse.min.js');
const mapReady = dependency('leaflet.js', 'leaflet@1.9.4/dist/leaflet.js')
  .then(() =>
    dependency('leaflet.markercluster.js', 'leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'),
  )
  .then(() => {
    librariesReady = true;
    return ensureMap();
  });
void mapReady.catch(() => {
  mapError = 'Library peta gagal dimuat. Periksa koneksi lalu muat ulang halaman.';
  setMapMessage();
});
void dataReady
  .then(() => {
    if (!generation) return selectDataset(null);
  })
  .catch(() => {
    loading = false;
    showStatus('Data belum tersedia', 'empty');
    showNotice('PapaParse gagal dimuat. Periksa salinan library atau impor berkas GeoJSON.');
    apply();
  });