# KARHUTLA GIS Indonesia

**Pengembangan Sistem Informasi Geografis Berbasis Web untuk Visualisasi dan Analisis Persebaran Titik Panas (Hotspot) Kebakaran Hutan dan Lahan di Indonesia**

WebGIS untuk mata kuliah Pengembangan SIG Web. Aplikasi menampilkan **12.822 deteksi VIIRS** pada 8–14 November 2026 UTC dari arsip lokal NASA FIRMS, dengan kecocokan pada 38 provinsi. Pengguna dapat mengganti arsip ini dengan CSV atau GeoJSON sendiri. Setiap angka di dashboard dihitung dari pengamatan yang lolos filter saat itu. [Asal data dan metode pemilihan](./data/README.md)

### Jalankan sekarang

Buka folder `karhutla-gis` di VS Code, lalu klik kanan `index.html` dan pilih **Open with Live Server**. Jika memakai Python 3, jalankan perintah berikut **dari folder yang berisi `index.html`**.

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Buka [dashboard lokal](http://127.0.0.1:8000/). Pada Windows dengan Python Launcher, gunakan `py -m http.server 8000 --bind 127.0.0.1`. Server hanya menyajikan berkas statis. Aplikasi tidak memerlukan langkah build, akun, basis data, atau API key. HTTP lokal diperlukan agar browser dapat memuat modul ES dan berkas data.

## Tahap 1 — Analisis dan arsitektur

Satu lokasi dapat menghasilkan beberapa deteksi pada lintasan satelit yang berbeda. Pertanyaan spasial yang dapat dijawab adalah **di provinsi mana deteksi terkonsentrasi, pada periode berapa, dan menurut satelit mana**. Mahasiswa, dosen, serta pengguna yang mempelajari pemantauan lingkungan dapat menelusuri lokasi, membandingkan hasil filter, dan menentukan titik yang perlu diperiksa lebih lanjut.

Hotspot menandai anomali panas pada piksel satelit. Konfirmasi kebakaran membutuhkan bukti tambahan, misalnya pemeriksaan lapangan. Confidence menerangkan keyakinan algoritme, sedangkan FRP mengukur daya radiasi dalam megawatt. Keduanya tidak cukup untuk menyimpulkan tingkat kerusakan atau luas terbakar. [Panduan produk VIIRS](https://www.earthdata.nasa.gov/s3fs-public/2025-06/VIIRS_C2_AF-375m_User_Guide_1.2.pdf)

| Kebutuhan fungsional | Komponen yang melayani |
|---|---|
| Memetakan pengamatan nasional, menjelajahi titik, membaca atribut | Peta Leaflet, klaster, popup, legenda dan atribusi |
| Membaca CSV/GeoJSON lokal, memeriksa input, mengenali provinsi | Dialog impor, PapaParse, validasi, pencocokan titik dengan poligon |
| Memilih provinsi, tanggal UTC, confidence, satelit dan kata pencarian wilayah | Panel filter dengan rentang inklusif, pencarian provinsi/kabupaten/kota menurut atribut, dan reset |
| Menjawab pertanyaan persebaran dan perubahan waktu | Ringkasan, grafik tren, peringkat provinsi, serta tabel detail |
| Mengukur jarak, mencari lokasi pengguna dan kembali ke cakupan data/nasional | Alat peta dan permintaan izin lokasi dari browser |
| Meninjau, membagikan dan memulihkan hasil | Tabel berpaginasi, ekspor CSV hasil filter, dan pemulihan arsip awal |

**Aliran data.** Berkas masuk melalui `data.js`. Parser membentuk rekaman, memvalidasi koordinat dan tanggal, menormalkan atribut, lalu mengisi provinsi jika dapat ditentukan secara spasial. `main.js` menyimpan dataset aktif di memori. `filters.js` menghasilkan satu himpunan hasil untuk peta, statistik, tabel, dan ekspor. Menonaktifkan layer hotspot hanya menyembunyikan simbol. Filter tetap menentukan jumlah pengamatan yang dianalisis.

**SDG 9.** Mahasiswa dapat mereproduksi analisis data penginderaan jauh dengan perangkat lunak terbuka dan infrastruktur web statis yang terjangkau. Proyek melatih kemampuan menerapkan teknologi geospasial untuk riset, sejalan dengan tujuan penguatan kapasitas teknologi. [SDG 9, khususnya target 9.5](https://sdgs.un.org/goals/goal9)

**SDG 11.** Tampilan lintas provinsi membantu diskusi tentang pengelolaan wilayah dan kebutuhan verifikasi risiko di sekitar permukiman. Analisis dampak terhadap penduduk memerlukan data tambahan tentang paparan, kerentanan, dan kejadian terkonfirmasi. [SDG 11, khususnya target 11.3 dan 11.5](https://sdgs.un.org/goals/goal11)

## Tahap 2 — Implementasi dan penggunaan

| Berkas | Tanggung jawab |
|---|---|
| [index.html](./index.html), [assets/css/style.css](./assets/css/style.css) | Struktur HTML5, label kontrol, dialog, navigasi, tampilan responsif dan fokus keyboard |
| [js/main.js](./js/main.js) | Memuat library, menyimpan dataset aktif, mengelola impor dan menghubungkan kontrol ke semua tampilan |
| [js/data.js](./js/data.js) | Membaca CSV/GeoJSON, memvalidasi waktu/angka/posisi, menentukan provinsi dan mengekspor CSV |
| [js/map.js](./js/map.js) | Inisialisasi Leaflet, basemap, marker cluster, popup, pengukuran jarak dan lokasi pengguna |
| [js/filters.js](./js/filters.js) | Pilihan filter, pencarian wilayah dan pemilihan rekaman |
| [js/statistics.js](./js/statistics.js) | Agregasi tanggal/provinsi, grafik SVG dan tabel angka |
| [js/ui.js](./js/ui.js) | Notifikasi, pilihan form, ikon, tabel pengamatan dan paginasi |
| [data/](./data/) | Arsip CSV awal, batas provinsi GeoJSON, kamus atribut dan riwayat sumber |
| [assets/map/](./assets/map/), [assets/vendor/](./assets/vendor/) | Geometri, relief, gaya atlas, salinan library, font dan lisensi |

Pada **Dashboard**, tarik peta atau gunakan tombol zoom. Klik klaster untuk menelusuri anggotanya, lalu pilih satu marker untuk melihat waktu UTC, koordinat, satelit, confidence dan atribut lain yang tersedia. Angka pada klaster adalah jumlah pengamatan berdekatan pada zoom tersebut. **Lapisan** menyediakan Atlas lokal, OpenStreetMap, Esri World Imagery dan sakelar hotspot.

Gabungkan filter, kemudian buka **Analisis statistik** untuk tabel lengkapnya. Grafik ringkas provinsi menampilkan maksimal lima wilayah, sedangkan halaman analisis menampilkan maksimal sepuluh pada grafik dan semua hasil pada tabel. Tanggal dalam grafik menggunakan UTC. Untuk rentang panjang, grafik mengelompokkan hari menjadi interval, sementara tabel mempertahankan rincian tanggal. Nol deteksi berarti tidak ada baris yang cocok dalam berkas.

Gunakan penggaris dan pilih dua titik untuk memperoleh jarak lingkaran besar dengan `map.distance` di Leaflet. Hasil menampilkan meter atau kilometer. Dengan keyboard, fokuskan peta, geser pusat peta dengan panah dan tekan Enter pada masing-masing titik. **Lokasi saya** menampilkan posisi dan lingkaran akurasi setelah izin diberikan melalui HTTPS atau localhost. Gunakan kontrol cakupan hasil atau cakupan Indonesia untuk mengatur kembali tampilan.

## Tahap 3 — Integrasi dataset

1. Di FIRMS Archive Download, masuk melalui Earthdata atau kode email bila diminta. Pilih wilayah Indonesia, periode dan sensor VIIRS, lalu minta CSV. Ekstrak jika unduhan berupa ZIP. Untuk arsip regional Asia Tenggara, potong ke wilayah Indonesia lebih dahulu jika ingin menghitung statistik nasional. [NASA FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/)
2. Pilih **Impor data**, kemudian pilih atau tarik CSV/GeoJSON. CSV memerlukan `latitude`, `longitude` dan `acq_date` dalam format YYYY-MM-DD. Kolom opsional mencakup `acq_time` (UTC), `satellite`, `instrument`, `confidence`, `frp`, `brightness` atau `bright_ti4`, `province` dan `source`. Untuk GeoJSON, gunakan Feature atau FeatureCollection berisi Point WGS84 dengan urutan `[bujur, lintang]` dan tanggal di `properties`. [Kamus data dan alias](./data/README.md)
3. Periksa hasil validasi. Berkas yang memiliki baris sah dapat dimuat bersama peringatan untuk baris yang dilewati. Jika seluruh baris gagal atau berkas tidak berisi pengamatan, dialog meminta berkas yang benar dan mempertahankan dataset sebelumnya. Provinsi kosong dicocokkan dengan poligon. Deteksi tanpa kecocokan tetap dihitung dalam total dan dilaporkan terpisah dari jumlah provinsi teridentifikasi.
4. Pilih **Ekspor CSV** untuk mengunduh semua baris hasil filter, termasuk halaman tabel yang sedang tidak terlihat. Buka **Dataset → Pulihkan dataset awal** untuk kembali ke arsip bawaan. Muat ulang halaman juga membuka kembali arsip awal.

Contoh berikut adalah satu observasi dari arsip bawaan. Simpan dengan ekstensi `.csv` untuk melihat pencocokan provinsi saat diimpor.

```csv
latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp,bright_ti4,source
-8.62359,141.00562,2026-11-08,0325,N20,VIIRS,nominal,6.5,331.4,NASA FIRMS
```

Untuk latihan sintetis, tambahkan `data_status` bernilai **DATA DEMO** pada setiap baris. Aplikasi menandai dataset yang memuat data demo dan mempertahankan label per baris pada ekspor. Berkas pengguna lainnya ditandai **Impor lokal**. Untuk tabel dari SiPongi, pastikan data mencakup koordinat per pengamatan dan zona waktu yang sesuai, serta cantumkan **SIPONGI KEMENHUT** sebagai sumber. [Peta resmi SiPongi](https://sipongi.gakkum.kehutanan.go.id/sebaran-titik-panas)

## Tahap 4 — Pengujian

### Pemeriksaan yang sudah dijalankan

| Status | Skenario | Hasil |
|---|---|---|
| ✓ | Muat aplikasi, modul ES dan aset dari HTTP, termasuk pada jalur subfolder yang menyimulasikan Pages | Dashboard dan atlas tampil. Salinan lokal memulihkan pemuatan ketika CDN disimulasikan gagal |
| ✓ | Muat arsip bawaan dan cocokkan ulang koordinat dengan poligon | 12.822 baris dan marker, 38 provinsi, dua satelit. Seluruh label provinsi arsip cocok dengan hasil pencocokan ulang |
| ✓ | CSV, GeoJSON, file kosong, tanggal kabisat, koordinat di luar rentang, kolom hilang dan angka opsional tidak valid | Validasi membedakan baris ditolak, atribut opsional kosong dan berkas tanpa pengamatan |
| ✓ | Polygon dengan lubang, MultiPolygon, tepi batas dan sistem koordinat terproyeksi | Titik yang ambigu tetap tanpa provinsi. GeoJSON ber-CRS terproyeksi ditolak |
| ✓ | Kombinasi filter, reset, pencarian, ringkasan, tabel, dan ekspor/reimpor | Hasil ekspor sesuai pilihan filter. Sel berpotensi sebagai formula diperlakukan sebagai teks saat diekspor |
| ✓ | Pergantian cepat dataset/filter, pengelompokan marker dan pemrosesan banyak baris | Pekerjaan lama tidak menimpa hasil baru. Impor 10.000 baris di Chrome berhasil. Impor 51.288 baris di Node.js dengan PapaParse asli berhasil dalam sekitar 1,57 detik, di luar rendering peta |
| ✓ | Kontrol keyboard, pengukuran dan geolocation | Diuji melalui otomasi browser dengan lokasi simulasi. Pemilihan dua titik melalui keyboard menghasilkan jarak dalam kilometer |
| ✓ | Pergantian atlas, OpenStreetMap, dan Esri World Imagery | Browser memuat ubin kedua penyedia melalui kontrol Lapisan. Atribusi berganti sesuai penyedia dan atlas tampil kembali saat dipilih |
| ✓ | Chrome 157 berbasis Chromium pada lebar 1440, 1280, 768 dan 375 piksel | Legenda dan atribusi terlihat. Halaman tidak meluber secara horizontal. Pada alur normal yang diuji, tidak tercatat galat JavaScript pada console atau pageerror |

**Regresi yang ditangani.** Impor memiliki nomor urut agar respons pembacaan lama tidak mengganti pilihan terakhir. Peta membatalkan batch lama dan mengosongkan klaster sebelum menggambar hasil baru. Atribut popup/tabel dirender sebagai teks. Batas provinsi diuji terhadap geometri setelah penyaringan kandidat. Atlas lokal memberi peta alternatif saat seluruh ubin daring pada permintaan tampilan gagal.

### Checklist pengguna pada perangkat dan hosting tujuan

- [ ] Di ponsel fisik, buka menu, ubah dua filter, klik klaster dan periksa legenda serta atribusi pada orientasi potret dan lanskap.
- [ ] Di HTTPS, coba izin lokasi ditolak dan diizinkan. Bandingkan lingkaran akurasi dengan layanan penentuan posisi perangkat.
- [ ] Di Firefox/Safari serta dengan pembaca layar yang akan digunakan, uji fokus keyboard, dialog impor, tabel, dan nama kontrol peta.
- [ ] Setelah publikasi, buka URL Pages dari jaringan lain. Muat ulang satu kali, uji kedua basemap daring, impor satu file nyata, lalu cocokkan ekspor dengan tabel.

## Tahap 5 — Publikasi dan atribusi

**Status distribusi.** Berkas siap dipublikasikan. GitHub Pages belum diaktifkan untuk proyek ini.

1. Buat repositori publik di GitHub, misalnya `karhutla-gis`. Unggah **isi folder proyek** pada branch `main` sehingga `index.html`, `js/`, `assets/` dan `data/` langsung berada di root repositori.
2. Pilih **Settings → Pages → Build and deployment → Source → Deploy from a branch**. Pilih **main** dan **/(root)**, kemudian **Save**.
3. Pantau proses Pages pada tab **Actions**. Setelah selesai, buka alamat yang ditampilkan di **Settings → Pages**. Jalur relatif membuat aset dan modul tetap dapat dimuat dari subfolder proyek.
4. Jika halaman tampil tanpa peta atau data, periksa permintaan 404 pada panel Network browser. Pastikan kapitalisasi nama file sama dan direktori data beserta aset lokal ikut terunggah. [Panduan resmi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

**Dependensi.** Leaflet 1.9.4, Leaflet.markercluster 1.5.3 dan PapaParse 5.5.3 memiliki versi terkunci. Pada host `.github.io`, JavaScript dimuat dari jsDelivr dan memakai salinan `assets/vendor/` bila permintaan gagal. Live Server, localhost dan host lain memakai salinan lokal. CSS, font DM Sans, ikon Lucide, atlas dan arsip disertakan dalam proyek. Statistik dirender menggunakan SVG dan tabel HTML. [Lisensi library, font dan ikon](./assets/vendor/)

**Peta dasar.** Atlas lokal menggunakan geometri dan relief Natural Earth (domain publik). Batas 38 provinsi berasal dari *Indonesia GeoJSON & TopoJSON Maps* oleh Deny Herianto dan kontributor (CC BY 4.0). OpenStreetMap menampilkan kredit © OpenStreetMap contributors. Esri World Imagery menampilkan kredit penyedia citra di kontrol atribusi. Kedua peta ubin memerlukan akses internet. [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) · [Batas dan lisensinya](./data/README.md) · [OpenStreetMap](https://www.openstreetmap.org/copyright) · [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)

## Tahap 6 — Evaluasi terhadap tugas dosen

| Tugas | Bukti yang dapat diperiksa |
|---|---|
| 1. Tema dan tujuan | Masalah spasial, pengguna, tujuan dan hubungan dengan SDG dijelaskan pada tahap 1 |
| 2. Data spasial | CSV sumber nyata, GeoJSON batas, impor kedua format, dokumentasi asal dan unit atribut |
| 3. Inisialisasi Leaflet | Pusat awal −2,5° dan 118°, zoom awal 4, kemudian cakupan Indonesia disesuaikan dengan ukuran panel |
| 4. Layer control | Tiga basemap dan sakelar layer hotspot tersedia pada kontrol lapisan |
| 5. Marker dan popup | Koordinat setiap rekaman terikat ke marker dengan rincian pengamatan dan sumber |
| 6. Legenda dan atribusi | Legenda titik/klaster, periode, sumber data serta kredit basemap terlihat di dashboard |
| 7. Interaksi tambahan | Filter kombinasi, geolocation, pengukuran, zoom ke hasil dan ke Indonesia, serta ekspor |
| 8. Responsif dan aksesibilitas | Tata letak lintas lebar 375–1440 piksel, kontrol berlabel, papan ketik, tabel data dan umpan balik status |
| 9. Dokumentasi dan publikasi | README, metode dataset, instruksi pengujian dan deployment. URL publik masih perlu dibuat pada akun GitHub pemilik |

| Kriteria dan bobot | Evaluasi implementasi |
|---|---|
| Peta tampil dan stabil · 20% | Atlas lokal dan kemampuan mengganti peta dasar teruji. Ketersediaan ubin daring bergantung pada jaringan dan penyedia |
| Data spasial terikat dengan benar · 25% | Arsip berasal dari dua produk NASA FIRMS, jumlah dan provinsi telah diverifikasi. Penyederhanaan batas membatasi ketelitian di pesisir dan pulau kecil |
| Interaktivitas · 25% | Peta, statistik, tabel dan ekspor mengikuti perubahan filter. Akurasi lokasi fisik perlu diuji pada perangkat pengguna |
| Desain dan aksesibilitas · 15% | Dashboard dan kontrol keyboard teruji di Chromium pada empat lebar. Uji pembaca layar dan perangkat fisik masih terbuka |
| Dokumentasi dan publikasi · 15% | Sumber, metode, alur pengujian dan konfigurasi Pages tersedia. Penerbitan dan uji URL publik tersisa pada repositori tujuan |

**Prioritas pengembangan.** Pertama, validasi sampel deteksi pesisir/perbatasan dengan batas resmi lebih rinci dan catat perubahan jumlah provinsi yang teridentifikasi. Kedua, ukur waktu impor dan interaksi pada ponsel sasaran sebelum menggunakan arsip tahunan yang jauh lebih besar. Ketiga, selesaikan uji URL publik dan aksesibilitas lintas browser. Semua impor saat ini memakai memori sesi browser. Untuk mereproduksi analisis, simpan CSV hasil filter, catat sumber dan periode UTC.
