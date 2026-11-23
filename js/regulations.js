import { byId, icon } from './ui.js';
import { formatNumber } from './statistics.js';

// Daftar peraturan perundangan (bisa ditambah atau diganti URL-nya ke file lokal ./data/pdf/nama-file.pdf)
const REGULATIONS = [
  {
    title: 'Pengelolaan Lingkungan Hidup',
    category: 'Undang-undang',
    number: 'UU No. 23 Tahun 1997',
    year: '1997',
    description: 'Ketentuan pokok pengelolaan lingkungan hidup dan pencegahan pencemaran serta perusakan lingkungan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1026.pdf',
  },
  {
    title: 'Pemerintahan Daerah',
    category: 'Undang-undang',
    number: 'UU No. 22 Tahun 1999',
    year: '1999',
    description: 'Kewenangan daerah dalam pengelolaan sumber daya alam dan pengendalian dampak lingkungan wilayah.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1027.pdf',
  },
  {
    title: 'Kehutanan',
    category: 'Undang-undang',
    number: 'UU No. 41 Tahun 1999',
    year: '1999',
    description: 'Pengaturan penyelenggaraan kehutanan, perlindungan hutan, dan larangan pembakaran hutan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1028.pdf',
  },
  {
    title: 'Perkebunan',
    category: 'Undang-undang',
    number: 'UU No. 18 Tahun 2004',
    year: '2004',
    description: 'Kewajiban pelaku usaha perkebunan dalam pencegahan dan penanggulangan kebakaran lahan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1029.pdf',
  },
  {
    title: 'Perlindungan dan Pengelolaan Lingkungan Hidup',
    category: 'Undang-undang',
    number: 'UU No. 32 Tahun 2009',
    year: '2009',
    description: 'Instrumen pencegahan kerusakan lingkungan, sanksi pidana, dan tanggung jawab mutlak atas kebakaran lahan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/880656_1638324482.pdf',
  },
  {
    title: 'Pengendalian Kerusakan dan atau Pencemaran Lingkungan Hidup yang Berkaitan dengan Kebakaran Hutan dan atau Lahan',
    category: 'Peraturan Pemerintah',
    number: 'PP No. 4 Tahun 2001',
    year: '2001',
    description: 'Standar baku kerusakan lingkungan hidup dan tanggung jawab penanggulangan karhutla.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1041.pdf',
  },
  {
    title: 'Perlindungan Hutan',
    category: 'Peraturan Pemerintah',
    number: 'PP No. 45 Tahun 2004',
    year: '2004',
    description: 'Penyelenggaraan perlindungan hutan dari gangguan kebakaran, perambahan, dan kerusakan kawasan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1043.pdf',
  },
  {
    title: 'Pengendalian Kebakaran Hutan dan Lahan',
    category: 'Peraturan Menteri Lingkungan Hidup dan Kehutanan',
    number: 'PermenLHK No. P.32/MenLHK/Setjen/Kum.1/3/2016',
    year: '2016',
    description: 'Organisasi pengendalian karhutla, Brigade Manggala Agni, serta sistem peringatan dan deteksi dini.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/136.pdf',
  },
  {
    title: 'Mekanisme pencegahan pencemaran dan/atau kerusakan lingkungan hidup yang berkaitan dengan kebakaran hutan dan/atau lahan',
    category: 'SK Menteri Lingkungan Hidup',
    number: 'No. 10 Tahun 2010',
    year: '2010',
    description: 'Mengefektifkan upaya pencegahan pencemaran dan/atau kerusakan lingkungan hidup yang berkaitan dengan kebakaran hutan dan/atau lahan',
    url: 'https://opsroom.sipongidata.my.id/storage/files/61.pdf',
  },
  {
    title: 'Prosedur Penanganan Krisis Kebakaran Hutan',
    category: 'SK Menteri Kehutanan',
    number: 'SK Menhut No. 97/Kpts-II/1998',
    year: '1998',
    description: 'Prosedur operasional standar pemadaman dan koordinasi lapangan pengendalian kebakaran hutan.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1045.pdf',
  },
  {
    title: 'Petunjuk Teknis Pencegahan dan Penanggulangan Kebakaran Hutan di Areal Pengusahaan Hutan dan Areal Penggunaan Lainnya',
    category: 'SK Dirjen PHPA/PHKA',
    number: 'SK Dirjen PHPA No. 243/Kpts/DJ-VI/1994',
    year: '1994',
    description: 'Tata laksana pelaporan hotspot, patroli terpadu, dan mobilisasi regu pemadam.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1049.pdf',
  },
  {
    title: 'Perdirjen Pedoman Uji Kepatuhan Dalkarhutla',
    category: 'Peraturan Dirjen PPI',
    number: 'Perdirjen PPI No. P.2/PPI/SET.8/KUM.1/2/2021',
    year: '2021',
    description: 'Pedoman Uji Kepatuhan Pemenuhan Kewajiban Pemegang Izin Usaha Pemanfaatan Hasil Hutan Kayu. ',
    url: 'https://opsroom.sipongidata.my.id/storage/files/perdirjen-pedoman-uji-kepatuhan.pdf',
  },
  {
    title: 'Pedoman Pembukaan Lahan dan Pekarangan Bagi Masyarakat di Kalimantan Tengah',
    category: 'Peraturan Gubernur',
    number: 'Pergub No. 52 Tahun 2008',
    year: '2008',
    description: 'Regulasi tingkat provinsi terkait larangan pembukaan lahan dengan cara membakar dan penetapan status siaga darurat.',
    url: 'https://opsroom.sipongidata.my.id/storage/files/1037.pdf',
  },
];

let initialized = false;

export function initRegulations() {
  if (!initialized) {
    const categorySelect = byId('reg-category');
    const searchInput = byId('reg-search');
    const resetBtn = byId('reg-reset');

    if (categorySelect && categorySelect.options.length <= 1) {
      const categories = [...new Set(REGULATIONS.map((item) => item.category))];
      for (const cat of categories) {
        categorySelect.append(new Option(cat, cat));
      }
    }

    categorySelect?.addEventListener('change', renderRegulations);
    searchInput?.addEventListener('input', renderRegulations);
    resetBtn?.addEventListener('click', () => {
      if (categorySelect) categorySelect.value = '';
      if (searchInput) searchInput.value = '';
      renderRegulations();
    });

    initialized = true;
  }

  renderRegulations();
}

export function renderRegulations() {
  const listEl = byId('reg-list');
  const countEl = byId('reg-count');
  if (!listEl) return;

  const selectedCategory = byId('reg-category')?.value || '';
  const query = (byId('reg-search')?.value || '').trim().toLowerCase();

  const filtered = REGULATIONS.filter((item) => {
    const matchCategory = !selectedCategory || item.category === selectedCategory;
    const matchQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.number.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });

  if (countEl) {
    countEl.textContent = formatNumber(filtered.length) + ' dokumen';
  }

  if (!filtered.length) {
    listEl.innerHTML = `
      <article class="panel" style="padding:1.5rem;text-align:center;color:#64748b;">
        Tidak ada dokumen peraturan yang sesuai dengan pencarian atau kategori tersebut.
      </article>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .map(
      (item) => `
      <article class="panel" style="padding:1.15rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div style="display:flex;align-items:flex-start;gap:1rem;flex:1;min-width:260px;">
          <div style="width:44px;height:52px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:11px;letter-spacing:.04em;flex-shrink:0;">
            <span>PDF</span>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:999px;background:#f1f5f9;color:#334155;">${item.category}</span>
              <span style="font-size:12.5px;font-weight:600;color:#e77741;">${item.number}</span>
            </div>
            <h3 style="font-size:1rem;font-weight:700;color:#14253a;margin:0 0 4px 0;line-height:1.35;">${item.title}</h3>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.45;">${item.description}</p>
          </div>
        </div>
        <a class="button secondary" href="${item.url}" target="_blank" rel="noopener" style="white-space:nowrap;">
          Buka PDF ↗
        </a>
      </article>
    `,
    )
    .join('');
}