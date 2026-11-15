import { formatDate } from './statistics.js';

const indonesia = [[-11.1, 94.9], [6.15, 141.1]];
const atlasCredit = '<a href="https://www.naturalearthdata.com/">Natural Earth</a>';
const provinceCredit = 'Batas: <a href="https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces">D. Herianto dkk.</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)';
const labelLocations = [
  ['Sumatra', -.65, 101.8, 'island', 2.8],
  ['Kalimantan', .35, 114.2, 'island', 2.8],
  ['Sulawesi', -1.35, 121.2, 'island', 3.6],
  ['Papua', -3.77, 137.1, 'island', 2.8],
  ['Jawa', -7.35, 110.7, 'island', 2.8],
  ['Malaysia', 4.5, 101.8, 'country', 2.6],
  ['Filipina', 9.1, 124.6, 'country', 2.6],
  ['Papua Nugini', -6.35, 145, 'country', 2.8],
  ['Australia', -16.3, 133.3, 'country', 2.6],
  ['Thailand', 14.3, 100.8, 'country', 2.6],
  ['Vietnam', 12.7, 108.1, 'country', 2.6],
  ['Timor Leste', -8.9, 126.05, 'country', 4.4],
  ['Samudra Hindia', -8.85, 97.7, 'sea', 2.7],
  ['Samudra Pasifik', 5.2, 141.3, 'sea', 2.8],
  ['Laut Jawa', -4.85, 110.7, 'sea', 3.4],
  ['Laut Banda', -5.85, 128.5, 'sea', 3.4],
  ['Laut Natuna', 3.65, 107.8, 'sea', 3.7],
  ['Laut Sulawesi', 3.5, 122.3, 'sea', 3.6],
  ['Laut Arafura', -9.1, 135.3, 'sea', 3.8],
  ['Laut Flores', -6.85, 121.4, 'sea', 4.5],
  ['Maluku', -.8, 128.6, 'island', 4.1],
  ['Bali', -8.4, 115.15, 'island', 5.25],
  ['Flores', -8.65, 121.7, 'island', 5.8],
  ['Jakarta', -6.18, 106.82, 'city', 4.4],
  ['Medan', 3.59, 98.67, 'city', 4.7],
  ['Makassar', -5.15, 119.43, 'city', 4.8],
  ['Jayapura', -2.53, 140.72, 'city', 4.8],
  ['Singapura', 1.29, 103.85, 'city', 4.65],
  ['Palembang', -2.99, 104.76, 'city', 5.1],
  ['Palangka Raya', -2.21, 113.91, 'city', 5.4],
  ['Pontianak', -.03, 109.34, 'city', 5.1],
  ['Samarinda', -.5, 117.15, 'city', 5.2],
  ['Surabaya', -7.25, 112.75, 'city', 5.6],
  ['Manado', 1.49, 124.84, 'city', 5.2],
  ['Ambon', -3.7, 128.18, 'city', 5.2],
  ['Kupang', -10.18, 123.61, 'city', 5.5],
];
const noop = () => {};
const decimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function popup(row) {
  const container = document.createElement('section');
  container.className = 'hotspot-popup';
  const title = document.createElement('h3');
  title.textContent = row.province || 'Deteksi titik panas';
  const fields = document.createElement('dl');
  const attributes = [
    ['Tanggal', row.date ? formatDate(row.date) : 'Tidak tersedia'],
    ['Waktu', row.time ? row.time + ' UTC' : null],
    ['Koordinat', row.latitude.toFixed(4) + '°, ' + row.longitude.toFixed(4) + '°'],
    ['Satelit', row.satellite || 'Tidak tersedia'],
    ['Confidence', row.confidence && /^\d+(\.\d+)?$/.test(row.confidenceRaw || '') && row.confidence !== row.confidenceRaw
      ? row.confidence + ' (' + row.confidenceRaw + ')' : row.confidence || 'Tidak tersedia'],
    ['FRP', row.frp != null ? decimal.format(row.frp) + ' MW' : null],
    ['Brightness', row.brightness != null ? decimal.format(row.brightness) + ' K' : null],
    ['Provinsi', row.province || 'Belum diketahui'],
    ['Sumber', row.source || 'Impor lokal'],
  ];
  for (const [label, value] of attributes) {
    if (value == null) continue;
    const key = document.createElement('dt');
    const detail = document.createElement('dd');
    key.textContent = label;
    detail.textContent = value;
    fields.append(key, detail);
  }
  container.append(title, fields);
  return container;
}

async function readGeometry(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error('Gagal membaca geometri peta.');
  return response.json();
}

function prepareAtlas(L, map, world, provinces) {
  const atlas = L.layerGroup();
  atlas.getAttribution = () => atlasCredit + (provinces ? ' · ' + provinceCredit : '');
  const paneNames = ['atlasLand', 'atlasRelief', 'atlasBoundaries', 'atlasLabels'];
  paneNames.forEach((name, index) => {
    const pane = map.createPane(name);
    pane.style.zIndex = String(210 + index * 10);
    pane.style.pointerEvents = 'none';
  });
  L.geoJSON(world, {
    pane: 'atlasLand', interactive: false,
    filter: feature => feature.properties.kind !== 'river',
    style: feature => ({
      color: '#a3b9a6', weight: .8, opacity: .95, fillOpacity: 1,
      fillColor: feature.properties.iso === 'IDN' ? '#dce7c9' : '#e0e5d3',
    }),
  }).addTo(atlas);
  L.imageOverlay(new URL('../assets/map/sunda-relief.webp', import.meta.url).href,
    [[-35, 74], [30, 166]], { pane: 'atlasRelief', interactive: false, opacity: .93, alt: '' }).addTo(atlas);
  L.geoJSON(world, {
    pane: 'atlasBoundaries', interactive: false, filter: f => f.properties.kind === 'river',
    style: { color: '#9fbfc2', weight: .75, opacity: .9 },
  }).addTo(atlas);
  if (provinces) {
    L.geoJSON(provinces, {
      pane: 'atlasBoundaries', interactive: false,
      style: { color: '#879e83', weight: .7, opacity: .68, fill: false, dashArray: '2 2' },
    }).addTo(atlas);
  }
  const grid = { pane: 'atlasBoundaries', color: '#668e95', weight: .65, opacity: .16, interactive: false, dashArray: '3 5' };
  for (let lat = -35; lat <= 35; lat += 5) L.polyline([[lat, 70], [lat, 170]], grid).addTo(atlas);
  for (let lng = 70; lng <= 170; lng += 5) L.polyline([[-35, lng], [35, lng]], grid).addTo(atlas);
  const labels = L.layerGroup().addTo(atlas);

  function updateLabels() {
    if (!map.hasLayer(atlas)) return;
    const zoom = map.getZoom();
    const box = map.getBounds().pad(.12);
    const accepted = [];
    labels.clearLayers();
    for (const [name, lat, lng, kind, minZoom] of labelLocations) {
      if (zoom < minZoom || !box.contains([lat, lng])) continue;
      const point = map.latLngToContainerPoint([lat, lng]);
      const width = name.length * (kind === 'island' ? 7 : 6.1) + 5;
      const left = kind === 'city' ? point.x : point.x - width / 2;
      const rect = L.bounds([left - 3, point.y - 8], [left + width + 3, point.y + 8]);
      if (accepted.some(other => other.intersects(rect))) continue;
      accepted.push(rect);
      const span = document.createElement('span');
      span.textContent = name;
      const icon = L.divIcon({ className: 'atlas-label ' + kind, html: span, iconSize: [0, 0], iconAnchor: [0, 0] });
      L.marker([lat, lng], { pane: 'atlasLabels', icon, interactive: false, keyboard: false }).addTo(labels);
    }
  }
  atlas.on('add', updateLabels);
  map.on('moveend resize', updateLabels);
  return atlas;
}

export async function createHotspotMap({
  element, onStatus = noop, onMeasure = noop, onCoordinates = noop, onLayerChange = noop, onVisibilityChange = noop,
}) {
  const L = globalThis.L;
  if (!L?.markerClusterGroup) throw new Error('Library Leaflet atau MarkerCluster belum berhasil dimuat.');
  element.classList.add('karhutla-map');
  element.setAttribute('role', 'region');
  const map = L.map(element, {
    center: [-2.5, 118], zoom: 4, minZoom: 2, maxZoom: 19, zoomControl: false,
    zoomSnap: .125, zoomDelta: 1, preferCanvas: true, scrollWheelZoom: false,
  });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  L.control.scale({ imperial: false, maxWidth: 80, position: 'bottomleft' }).addTo(map);
  function fitIndonesia() {
    map.fitBounds(indonesia, { paddingTopLeft: [14, 12], paddingBottomRight: [47, 12], animate: false });
  }
  fitIndonesia();
  const [world, provinces] = await Promise.allSettled([
    readGeometry('../assets/map/archipelago.geojson'), readGeometry('../data/provinces.geojson'),
  ]);
  const bases = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19, maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
    esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19, maxZoom: 19,
      attribution: '<a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri</a>, Vantor, Earthstar Geographics &amp; GIS User Community',
    }),
  };
  if (world.status === 'fulfilled') {
    bases.atlas = prepareAtlas(L, map, world.value, provinces.status === 'fulfilled' ? provinces.value : null);
  }
  let basemap;
  function setBasemap(name) {
    if (!bases[name]) {
      onStatus('Atlas lokal tidak tersedia. Pilih salah satu peta dasar daring.');
      return;
    }
    if (basemap === name) return;
    if (basemap) map.removeLayer(bases[basemap]);
    basemap = name;
    bases[name].addTo(map);
    onLayerChange(name);
  }
  for (const key of ['osm', 'esri']) {
    let successful = 0;
    let failed = 0;
    bases[key].on('loading', () => { successful = 0; failed = 0; });
    bases[key].on('tileload', () => successful++);
    bases[key].on('tileerror', () => failed++);
    bases[key].on('load', () => {
      if (basemap !== key || !failed || successful) return;
      if (bases.atlas) {
        setBasemap('atlas');
        onStatus('Peta daring tidak dapat dimuat. Atlas lokal ditampilkan.');
      } else {
        onStatus('Peta dasar tidak dapat dimuat. Periksa koneksi atau pilih peta dasar lain.');
      }
    });
  }
  setBasemap(bases.atlas ? 'atlas' : 'osm');
  if (!bases.atlas || provinces.status === 'rejected') onStatus('Sebagian data atlas lokal tidak dapat dimuat.');

  const ClusterIcon = L.DivIcon.extend({
    createIcon(oldIcon) {
      const icon = L.DivIcon.prototype.createIcon.call(this, oldIcon);
      icon.setAttribute('aria-label', this.options.label);
      return icon;
    },
  });
  const cluster = L.markerClusterGroup({
    maxClusterRadius: zoom => zoom < 6 ? 43 : 35,
    showCoverageOnHover: false, animate: false,
    iconCreateFunction(group) {
      const count = group.getChildCount();
      const size = Math.min(38, 18 + Math.ceil(Math.log10(count + 1)) * 4);
      const span = document.createElement('span');
      span.textContent = String(count);
      return new ClusterIcon({
        className: 'hotspot-cluster', html: span, iconSize: [size, size],
        label: count + ' deteksi, perbesar untuk rincian',
      });
    },
  }).addTo(map);
  const pointIcon = L.divIcon({ className: 'hotspot-point', html: '<span></span>', iconSize: [20, 20] });
  let rows = [];
  let frame = 0;
  let visible = true;
  let disposed = false;

  function drawRows() {
    cancelAnimationFrame(frame);
    cluster.clearLayers();
    map.closePopup();
    if (!visible) return;
    let index = 0;
    function nextBatch() {
      const end = Math.min(index + 550, rows.length);
      const markers = [];
      for (; index < end; index++) {
        const row = rows[index];
        const marker = L.marker([row.latitude, row.longitude], {
          icon: pointIcon, title: 'Deteksi titik panas' + (row.province ? ' · ' + row.province : ''),
        }).bindPopup(() => popup(row), { maxWidth: 290 });
        markers.push(marker);
      }
      cluster.addLayers(markers);
      if (index < rows.length) frame = requestAnimationFrame(nextBatch);
    }
    nextBatch();
  }
  function setRows(nextRows) {
    rows = nextRows;
    drawRows();
  }
  function setHotspotsVisible(value) {
    const next = Boolean(value);
    if (next === visible) return;
    visible = next;
    if (visible) cluster.addTo(map);
    drawRows();
    if (!visible) map.removeLayer(cluster);
    onVisibilityChange(visible);
  }
  function fitFiltered() {
    if (!rows.length) {
      onStatus('Belum ada titik dalam hasil filter.');
      return;
    }
    const bounds = L.latLngBounds([]);
    for (const row of rows) bounds.extend([row.latitude, row.longitude]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12, animate: false });
  }

  const location = L.layerGroup().addTo(map);
  let locating = false;
  function locate() {
    if (!navigator.geolocation || !isSecureContext) {
      onStatus('Lokasi memerlukan dukungan geolocation pada HTTPS atau localhost.');
      return;
    }
    if (locating) return;
    locating = true;
    onStatus('Menunggu izin lokasi dari peramban…');
    navigator.geolocation.getCurrentPosition(position => {
      locating = false;
      if (disposed) return;
      const { latitude, longitude, accuracy } = position.coords;
      const latlng = L.latLng(latitude, longitude);
      location.clearLayers();
      L.circle(latlng, {
        radius: accuracy, color: '#2379ae', weight: 1, fillOpacity: .10, interactive: false,
      }).addTo(location);
      L.circleMarker(latlng, { radius: 6, color: 'white', weight: 2, fillColor: '#2379ae', fillOpacity: 1 })
        .bindTooltip('Lokasi Anda').addTo(location);
      map.setView(latlng, 10, { animate: false });
      onStatus('Lokasi ditemukan. Perkiraan akurasi ' + decimal.format(accuracy) + ' m.');
    }, error => {
      locating = false;
      if (disposed) return;
      const messages = { 1: 'Izin lokasi tidak diberikan.', 2: 'Lokasi tidak tersedia pada perangkat ini.', 3: 'Pencarian lokasi melewati batas waktu.' };
      onStatus(messages[error.code] || 'Lokasi perangkat gagal diperoleh.');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  }

  let measuring = false;
  let origin = null;
  const lineLayer = L.layerGroup().addTo(map);
  function clearMeasure() {
    measuring = false;
    origin = null;
    lineLayer.clearLayers();
    element.classList.remove('is-measuring');
    onMeasure('', false);
  }
  function toggleMeasure() {
    if (measuring) { clearMeasure(); return; }
    lineLayer.clearLayers();
    map.closePopup();
    measuring = true;
    origin = null;
    element.classList.add('is-measuring');
    onMeasure('Pilih titik awal', true);
    onStatus('Pilih dua titik di peta. Dengan keyboard, geser peta lalu tekan Enter pada tiap titik.');
    element.focus({ preventScroll: true });
  }
  function measurePoint(latlng) {
    if (!measuring) return;
    const dot = L.circleMarker(latlng, { radius: 5, fillColor: '#fff', fillOpacity: 1, color: '#22566c', weight: 2, interactive: false }).addTo(lineLayer);
    if (!origin) {
      origin = latlng;
      onMeasure('Pilih titik akhir', true);
      return;
    }
    const meters = map.distance(origin, latlng);
    const length = meters < 1000 ? decimal.format(Math.round(meters)) + ' m' : decimal.format(meters / 1000) + ' km';
    L.polyline([origin, latlng], { color: '#22566c', weight: 2.5, dashArray: '6 5', interactive: false }).addTo(lineLayer);
    dot.bindTooltip(length, { permanent: true, direction: 'top', className: 'measure-tooltip' }).openTooltip();
    measuring = false;
    origin = null;
    element.classList.remove('is-measuring');
    onMeasure(length, false);
    onStatus('Jarak antartitik ' + length + '.');
  }
  function keyMeasure(event) {
    if (event.key === 'Escape') clearMeasure();
    if (event.target === element && event.key === 'Enter' && measuring) {
      event.preventDefault();
      measurePoint(map.getCenter());
    }
  }
  map.on('click', event => measurePoint(event.latlng));
  map.on('mousemove', event => onCoordinates(event.latlng.lat, event.latlng.lng));
  map.on('moveend', () => { const center = map.getCenter(); onCoordinates(center.lat, center.lng); });
  onCoordinates(map.getCenter().lat, map.getCenter().lng);
  element.addEventListener('keydown', keyMeasure);
  let previousWidth = element.clientWidth;
  const observer = new ResizeObserver(() => {
    if (!element.clientWidth || !element.clientHeight) return;
    const before = map.getBounds();
    const wasNational = before.contains(indonesia);
    map.invalidateSize({ pan: false, animate: false });
    if (element.clientWidth > 0 && previousWidth !== element.clientWidth && wasNational) fitIndonesia();
    previousWidth = element.clientWidth;
  });
  observer.observe(element);
  return {
    setRows, setBasemap, setHotspotsVisible, fitIndonesia, fitFiltered, locate, toggleMeasure, clearMeasure,
    zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut(),
    invalidate: () => {
      if (element.clientWidth && element.clientHeight) map.invalidateSize({ pan: false, animate: false });
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener('keydown', keyMeasure);
      map.remove();
    },
  };
}
