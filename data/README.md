# Data pengamatan KARHUTLA GIS Indonesia

## Arsip yang disertakan

`sample-hotspots.csv` berisi **12.822 deteksi VIIRS nyata dari NASA FIRMS** dalam dua berkas regional Asia Tenggara yang diunduh pada 15 November 2026. Nama `sample` menunjukkan cuplikan waktu. Aplikasi memuat salinan lokal ini saat dibuka. Angka berikut berlaku khusus untuk berkas tersebut.

| Cakupan cuplikan | Nilai |
|---|---|
| Tanggal akuisisi yang dipilih | 8–14 November 2026, inklusif, UTC |
| Produk | VIIRS 375 m Collection 2, versi CSV `2.0NRT` |
| Platform | NOAA-20, 6.294 deteksi. NOAA-21, 6.528 deteksi |
| Unit hitung | Satu baris untuk satu piksel terdeteksi pada satu pengamatan satelit |
| Cakupan spasial | Pusat piksel berada di dalam tepat satu provinsi menurut poligon lokal. Ada kecocokan pada 38 provinsi |
| SHA-256 cuplikan | `cbb7da2b706c0e943601654dc87ba72cbfcad40f8ad6b7672fc27fbc1c0795b7` |

Data pengamatan disediakan melalui NASA LANCE FIRMS. Kedua tautan CSV adalah unduhan tujuh hari bergulir dan isinya berubah. Dua produk NRT tercatat di katalog resmi NASA sebagai `VJ114IMGTDL_NRT` (NOAA-20) dan `VJ214IMGTDL_NRT` (NOAA-21). [Unduhan NOAA-20](https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv) · [Unduhan NOAA-21](https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_7d.csv) · [Katalog koleksi NASA](https://cmr.earthdata.nasa.gov/search/site/collections/directory/LANCEMODIS/gov.nasa.eosdis)

### Cara cuplikan disusun

1. Baca kedua CSV regional. Hash SHA-256 asli NOAA-20 ialah `ef4c2d4bca64360f393d449d7f8375f357ac0d243aabe5cbea7612855ee8e691`. Untuk NOAA-21 ialah `a3e97b2c0189c5ac862add45832284c26ad9dfb9b8b52ba563b9fe98ba8e719b`.
2. Pilih baris dengan `2026-11-08 <= acq_date <= 2026-11-14`. Uji `[longitude, latitude]` terhadap poligon lokal dengan `createProvinceLookup` dalam `js/data.js`. Pertahankan seluruh baris yang cocok dengan satu provinsi, pada semua kelas confidence.
3. Pertahankan kolom asli. Tambahkan `province` dari hasil pencocokan, `province_method=poligon`, `instrument=VIIRS`, dan `source=NASA FIRMS`. Gabungkan dua hasil dan urutkan berdasarkan tanggal kemudian waktu UTC. Lokasi pengamatan berulang tetap tercatat sebagai pengamatan terpisah.

Cuplikan mencakup pengamatan yang tersedia saat unduhan. Poligon sederhana dapat melewatkan pulau kecil, daerah pesisir atau titik di garis batas. Produk NRT dapat berbeda dari produk sains hasil pemrosesan ulang. Cuplikan ini tidak mengukur luas terbakar, jumlah kejadian kebakaran unik, atau seluruh kebakaran Indonesia.

## Batas provinsi

`provinces.geojson` merupakan salinan berkas *Indonesia GeoJSON & TopoJSON Maps (38 Provinces)* dari **Deny Herianto** dan kontributor, versi metadata 1.0.0. Nama berkas lokal diubah, sedangkan isi berkas dipertahankan. SHA-256 `97f23f738c7aa66836b971d76381c009a34c6aafe9c982e85f060e678402027`. Atribut nama menggunakan `PROVINSI`. Lisensi dataset adalah Creative Commons Attribution 4.0 International. [Sumber dan metadata](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces) · [Keterangan lisensi dataset](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces/blob/main/DATA_LICENSE.md) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Saat impor, nama provinsi dari berkas pengguna diprioritaskan. Jika kolom kosong, aplikasi menyaring kandidat dengan kotak pembatas dan menguji bagian luar beserta lubang setiap Polygon atau MultiPolygon. Titik di luar poligon, pada garis batas atau di daerah tumpang tindih tetap memiliki provinsi kosong. Jika batas gagal dimuat, koordinat valid masih dapat ditampilkan. Peta ini untuk pembelajaran pada skala nasional. Untuk keputusan setempat, periksa ulang posisi dengan batas administratif resmi yang lebih rinci dan data lapangan.

## Mengunduh dan mengimpor

1. Buka halaman unduhan arsip FIRMS. Untuk periode historis, ikuti autentikasi Earthdata atau kode email jika diminta. Pilih Indonesia sebagai wilayah, sensor VIIRS beserta platform, tanggal awal dan akhir, dan format CSV. Untuk data terbaru, unduhan regional publik tersedia dari halaman Active Fire Data. [FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/) · [FIRMS Active Fire Data](https://firms.modaps.eosdis.nasa.gov/active_fire/)
2. Unduh hasil dan ekstrak CSV jika diterima dalam ZIP. Berkas **SouthEast Asia** meliputi negara lain. Untuk analisis Indonesia, pilih unduhan per negara atau potong berkas regional dengan batas Indonesia sebelum mengimpornya. Pengimpor menerima koordinat WGS84 yang valid juga di luar Indonesia. Deteksi tanpa kecocokan provinsi tetap masuk jumlah deteksi.
3. Buka aplikasi melalui HTTP lokal atau HTTPS, pilih **Impor Data** dan pilih berkas. Tinjau jumlah baris diterima, peringatan, periode, serta hasil filter. Nama berkas impor menunjukkan asal lokal. Atribusi di kolom `source` berasal dari pembuat berkas. Impor berlangsung di browser dan menggantikan kumpulan data aktif.
4. Untuk data **SiPongi**, peroleh tabel dengan koordinat yang diizinkan untuk digunakan, sesuaikan header di bawah, verifikasi zona waktu, dan sertakan `source=SIPONGI KEMENHUT`. SiPongi meminta pengguna mengatribusikan datanya. [SiPongi Kementerian Kehutanan](https://sipongi.gakkum.kehutanan.go.id/sebaran-titik-panas)

Versi ini mengambil berkas lokal dan tidak memerlukan API key. API FIRMS dapat memerlukan MAP_KEY, pembatasan transaksi dan dukungan CORS dari penyedia. Kunci yang ditanam di HTML/JavaScript akan dapat dibaca pengunjung GitHub Pages. [Panduan API FIRMS](https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html)

## Kontrak impor

CSV UTF-8 dapat memakai koma, titik koma, atau tab sebagai pemisah. Gunakan titik desimal. Alias dan nama kolom tidak membedakan huruf besar-kecil. Setiap baris CSV harus mengikuti struktur header.

| Kolom | Aturan |
|---|---|
| `latitude`, `longitude` | Wajib pada CSV. Lintang −90 hingga 90 dan bujur −180 hingga 180 derajat. Alias `lat`, `lon`, `lng` |
| `acq_date` | Wajib, tanggal kalender sah `YYYY-MM-DD` berdasarkan tanggal UTC pengamatan. Alias `date`, `tanggal` |
| `acq_time` | Waktu UTC, HHMM atau HH:MM. Nilai seperti `5` dibaca 00:05. Alias `time`, `waktu` |
| `satellite`, `instrument` | Platform dan sensor. Nama singkat FIRMS seperti `N20` dan `N21` ditampilkan sebagai NOAA-20 dan NOAA-21. Alias `satelit`, `sensor` |
| `confidence` | VIIRS memakai label `l/n/h` atau `low/nominal/high`. MODIS memakai nilai 0–100. Angka MODIS di bawah 30 masuk kelas rendah, 30 hingga kurang dari 80 nominal, dan 80–100 tinggi. Klasifikasi ini hanya diterapkan jika sensor dikenali. Nilai sumber dipertahankan untuk ekspor |
| `frp` | Fire Radiative Power, daya radiasi yang diperkirakan dalam megawatt. Angka valid ≥ 0 |
| `bright_ti4` atau `brightness` | Suhu kecerahan kanal produk dalam kelvin, angka > 0. Aplikasi mengutamakan `bright_ti4` jika terisi |
| `province`, `region` | Nama provinsi dan kabupaten/kota opsional. Alias provinsi `provinsi`. Alias wilayah `kabupaten`, `kota`, `district`, `city` |
| `source`, `data_status` | Atribusi berkas dan label asal data. Untuk contoh sintetis, isi kolom `data_status` setiap baris dengan `DATA DEMO`. Label ikut tercantum pada hasil ekspor |

GeoJSON menggunakan `Feature` atau `FeatureCollection` dengan geometri `Point`, koordinat numerik `[longitude, latitude]` dalam WGS84, dan atribut di `properties`. Setiap feature tetap memerlukan tanggal. Untuk mencoba impor tanpa menyusun data, ambil satu atau beberapa baris dari CSV bawaan beserta header.

Baris tanpa tanggal/koordinat sah, struktur kolom tidak sesuai, atau geometri selain titik dilewati. Nilai opsional yang bermasalah dikosongkan dan dilaporkan. Berkas dengan header sah dan nol baris atau `FeatureCollection` kosong menghasilkan nol deteksi. Berkas tanpa isi, format JSON rusak, header wajib hilang, atau tanda kutip CSV rusak menghasilkan pesan kesalahan.

Pengamatan menunjukkan pusat piksel dengan anomali panas. Aktivitas vulkanik, sumber panas industri, awan, resolusi piksel dan waktu lintasan dapat memengaruhi interpretasi. Confidence menggambarkan kualitas deteksi menurut algoritma. FRP mengukur daya radiasi dalam satu pengamatan. Keduanya memerlukan konteks tambahan untuk penilaian dampak karhutla. [Panduan VIIRS Collection 2](https://www.earthdata.nasa.gov/s3fs-public/2025-06/VIIRS_C2_AF-375m_User_Guide_1.2.pdf) · [Panduan MODIS Collection 6 dan 6.1](https://www.earthdata.nasa.gov/s3fs-public/2023-09/MODIS_C6_C6.1_Fire_User_Guide_1.0.pdf) · [Penjelasan ilmiah NASA FIRMS](https://forum.earthdata.nasa.gov/viewtopic.php?t=5188)
