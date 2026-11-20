# Tur ruang server (`/tour`)

Seluruh isi portfolio sebagai kartu yang digulir, dengan ruang server 3D di
belakangnya. Menggulir halaman menggerakkan kamera dan robot dari satu
perhentian ke perhentian berikutnya. Ini calon pengganti beranda; saat ini
masih **pratinjau** di `/tour`.

Bedanya dengan `/playground`: di sana pengunjung menggerakkan robot sendiri
(jelajah bebas); di sini cukup menggulir, dan semua isi terbaca tanpa harus
"bermain". Keduanya memakai ruangan dan komponen scene yang sama.

## Posisi di rencana lima tahap

| Tahap | Isi                                                        | Status                                                            |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| 1     | Playground: ruangan, rak proyek, robot                     | Selesai                                                           |
| 2     | Tiga stasiun di `/playground` + endpoint status di backend | Selesai                                                           |
| 3     | Tur dengan scroll di `/tour` (dokumen ini)                 | Selesai                                                           |
| 4     | Uji di ponsel sungguhan dan ukur kecepatan muat            | Ukur lab selesai; uji ponsel sungguhan menunggu (lihat "Tahap 4") |
| 5     | Tukar beranda ke tur — hanya bila angka tahap 4 bagus      | Belum (titik keputusan)                                           |

Selama masih pratinjau, `/tour` ber-`noindex` (canonical ke dirinya sendiri),
tidak masuk sitemap, dan tidak ditautkan dari beranda. Beranda (`/`) tidak
berubah.

## Perhentian

Urutannya mengikuti letak di ruangan, bukan urutan beranda.

| #   | `id` (jangkar) | Kartu                                 | Yang terlihat di ruangan       | Data                     |
| --- | -------------- | ------------------------------------- | ------------------------------ | ------------------------ |
| 01  | `top`          | Headline, tombol aksi, angka          | Seluruh ruangan dari pojok     | `src/content/profile.ts` |
| 02  | `about`        | Profil dan keahlian per kelompok      | Deretan rak dari atas          | `/tags`                  |
| 03  | `projects`     | Proyek unggulan (tautan ke detailnya) | Baris rak depan, mulai R01     | `/projects?featured`     |
| 04  | `experience`   | Riwayat kerja                         | Papan di dinding barat         | `/experiences`           |
| 05  | `status`       | Status API saat itu juga              | Meja terminal, monitor terbaca | `/healthz`, `/readyz`    |
| 06  | `contact`      | Form kontak                           | Kotak surat                    | `POST /contact-messages` |

- Perhentian `experience` hanya ada bila `/experiences` mengembalikan data;
  penomoran sesudahnya bergeser.
- `id`-nya sengaja sama dengan jangkar beranda (`#about`, `#projects`,
  `#experience`, `#contact`), supaya tautan yang sudah beredar tetap benar
  setelah beranda ditukar.
- Menunjuk (atau memfokus) sebuah proyek di kartu menyorot raknya di ruangan.

## Dua tampilan, satu markup

| Tampilan | Kapan menjadi bawaan                                                                                                            | Isinya                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 3D       | Lebar ≥ 64rem (1024 px) **dan** tinggi ≥ 37,5rem (600 px), tanpa permintaan pengurangan gerak — laptop, desktop, tablet lanskap | Tiap perhentian setinggi layar, kartu di kiri |
| Ringkas  | Ponsel (juga saat lanskap), tablet potret, `prefers-reduced-motion`, tanpa WebGL, tanpa JavaScript                              | Kartu bertumpuk di tengah, tanpa kanvas       |

- **Bawaannya ditentukan CSS, bukan JavaScript** (`globals.css`, blok "Tur
  ruang server"). HTML dari server sudah berada di tata letak yang benar,
  jadi halaman tidak melompat saat React terhidrasi. Kueri media yang sama
  dipakai `AUTO_3D_QUERY` di `TourShell.tsx` untuk memutuskan apakah kanvas
  dipasang; sebuah test menjaga keduanya tetap identik.
- Tombol **Simple version / 3D version** di bilah atas menimpa bawaan itu.
  Pilihannya disimpan di `localStorage` (`tour-mode`) dan dipasang sebagai
  `data-tour-mode` pada `<html>` — **sebelum paint**, oleh skrip inline kecil
  di `<head>` root layout (`TOUR_MODE_SCRIPT`). Pengunjung yang pernah memilih
  tidak melihat tata letak bawaan sekejap lalu melompat.
  - Harus `<script>` inline biasa. `<Script strategy="beforeInteractive">`
    di App Router hanya mengantre dan baru jalan setelah paint pertama;
    terukur sebagai CLS 0,146 sebelum diganti.
- Tanpa WebGL atau bila scene gagal dimuat: React memasang
  `data-mode="simple"` pada `.tour` (menang atas pilihan pengunjung) dan
  tombolnya disembunyikan. Ini satu-satunya kasus tata letak berganti setelah
  hidrasi.
- Kode 3D (three.js + scene, ±250 KB gzip) baru diunduh bila tampilan 3D
  benar-benar dipakai; pengunjung ponsel tidak mengunduhnya sama sekali
  kecuali menekan tombolnya.
- Baris "Scroll to walk through the room." tampil-tidaknya ditentukan CSS
  (`.tour-only-3d`), sama seperti tata letaknya. Teks tombol ditentukan
  JavaScript dan baru benar setelah hidrasi; lebarnya dibuat tetap supaya
  pergantian teks tidak menggeser apa pun.
- Bila bundel JavaScript gagal dimuat — bukan dimatikan — layar lebar
  tertinggal di tata letak tinggi tanpa kanvas, dengan baris petunjuk gulir
  tetap tampil dan tombol ganti tampilan tidak berfungsi; isinya tetap
  terbaca.

## Arsitektur

```
src/app/tour/page.tsx            Server: ambil semua data, kirim ke shell
src/components/tour/
  TourShell.tsx                  Klien: kartu, bilah atas, rel, posisi gulir,
                                 pilihan tampilan, status backend
  TourCanvas.tsx                 Dimuat malas: <Canvas>, kamera & robot
                                 digerakkan posisi gulir
  TourPerf.tsx                   Panel ukur; hanya dimuat dengan `?perf`
src/lib/tour/                    Logika murni, tanpa three.js/DOM
  tour.ts                        Perhentian, jalur robot, keadaan pada
                                 `progress`, posisi gulir → `progress`
  mode.ts                        Pilihan tampilan (localStorage) + skrip pra-paint
  perf.ts                        Ringkasan frame dan teks laporan ukur
src/content/profile.ts           Teks profil — satu sumber untuk beranda & tur
src/lib/skills.ts                Pengelompokan tag keahlian (beranda & tur)
```

Dipakai bersama dengan `/playground` (dipisahkan dari berkas playground di
tahap ini, tanpa mengubah perilakunya):

```
src/hooks/use-environment.ts                   WebGL, gerak dikurangi, tab tersembunyi, media query
src/components/playground/SceneBoundary.tsx    Menangkap kegagalan scene
src/components/playground/HealthSummary.tsx    Pil + tabel status
src/components/playground/ExperienceList.tsx   Daftar riwayat kerja
src/components/playground/scene/performance.tsx  Resolusi adaptif, deteksi perangkat lemah
src/components/playground/scene/{Room,Racks,Fixtures,RobotDog}.tsx  Scene, dipakai apa adanya
```

### Dari gulir ke gambar

1. `TourShell` mengukur tiap bagian (diukur ulang saat ukuran berubah) dan
   menurunkan **dataran**-nya (`plateaus`): rentang posisi gulir tempat bagian
   itu "penuh". Tiap halaman digulir, `progressAt` menghitung `progress`: di
   dalam dataran bagian ke-k nilainya tepat k, di antara dua dataran linear.
   - Bagian yang muat di layar: datarannya satu titik (titik tengahnya).
   - Bagian yang lebih tinggi dari layar (daftar pengalaman yang panjang):
     datarannya sepanjang ia memenuhi layar. Kamera diam selama kartunya
     dibaca, dan lompat ke jangkarnya langsung mengaktifkan perhentian itu.
2. `progress` ditulis ke sebuah ref — bukan state — supaya menggulir tidak
   merender ulang React. Hanya perhentian aktif (pembulatannya) yang menjadi
   state.
3. Di tiap frame, `TourCanvas` mengejar nilai itu dengan peredaman lalu
   memanggil `tourState(tour, progress)`: posisi kamera, titik pandang, dan
   posisi robot.

`tourState` memakai peredam masuk-keluar, jadi kamera berlama-lama di tiap
perhentian (kartunya sedang dibaca) dan bergerak cepat di antaranya.

### Robot

Jalur robot antar-perhentian dicari di grid navigasi ruangan (`findRoute`,
sama dengan klik-untuk-jalan di playground), lalu ditempuh menurut panjangnya.
Di tata letak sekarang semua jalur kebetulan lurus dan bebas; pencarian jalur
adalah jaring pengaman bila tata letak berubah, dan dijaga test dengan
halangan buatan. Arah hadap mengikuti arah gerak, lalu menghadap perabotnya
saat berhenti.

### Kamera

- Tiap perhentian punya posisi kamera dan titik pandang sendiri, diturunkan
  dari `layout` (diukur dari dinding depan, supaya tetap benar saat baris rak
  bertambah).
- Di layar lebar gambar digeser ke kanan separuh lebar kartu
  (`setViewOffset`), supaya subjek berada di area yang tidak tertutup kartu.
- Di layar potret sudut pandang vertikal dilebarkan (`fovForAspect`) supaya
  cakupan mendatar tidak menyusut, dan gambar dinaikkan karena kartu menutupi
  bagian bawah.

## Yang dijaga

- **Isi lengkap sejak dari server.** Semua data diambil di komponen server;
  HTML pertama memuat keenam bagian, satu `<h1>`, dan tautan asli ke tiap
  proyek. Tanpa JavaScript, blok `<noscript>` memaksa tata letak ringkas.
- **Kanvas hanya latar.** `aria-hidden`, `pointer-events: none`; tidak ada
  yang hanya bisa dicapai lewat 3D.
- **Satu sumber isi.** Headline, paragraf profil, angka, dan tautan profil
  ada di `src/content/profile.ts` dan dipakai beranda maupun tur. Form kontak,
  daftar pengalaman, dan ringkasan status adalah komponen yang sama dengan
  beranda/playground.
- **Status backend hemat.** Baru diperiksa saat pengunjung berada dalam satu
  perhentian dari kartu status; tiap 10 dtk selama kartu itu yang dibaca,
  60 dtk selain itu; berhenti saat tab tersembunyi. Pengunjung yang tidak
  pernah menggulir ke sana tidak mengirim satu permintaan pun.
- **Robot tidak menembus apa pun; kamera tidak masuk ke dalam rak maupun
  perabot, dan tidak berada di balik dinding barat/belakang** — diuji untuk
  tiap jumlah baris rak (2–6), dengan dan tanpa dinding pengalaman.
- **Fokus keyboard dan jangkar tidak mendarat di balik bilah atas**
  (`scroll-padding-top` pada `<html>` selama halaman tur terpasang).
- **Render berhenti saat tab tersembunyi**; resolusi turun otomatis bila FPS
  jatuh (sama dengan playground).

## Verifikasi manual

Jalankan backend + `pnpm dev`, buka `/tour`:

1. Layar lebar: gulir dari atas ke bawah — kamera berpindah per perhentian,
   robot berjalan mengikutinya, rel di kanan menandai perhentian aktif.
2. Klik sebuah perhentian di rel → halaman bergulir ke sana.
3. Arahkan kursor ke sebuah proyek di kartu → raknya menyala.
4. Kartu status: "Operational" dengan dua baris; monitor di ruangan
   menampilkan hal yang sama.
5. "Simple version" → kanvas hilang, kartu bertumpuk; muat ulang → pilihan
   masih berlaku. "3D version" mengembalikannya.
6. Lebar ponsel: bawaannya tanpa 3D; "3D version" menyalakannya dengan kartu
   di bawah.
7. `curl -s localhost:3000/tour | grep -o 'class="tour-stop"' | wc -l` → 6
   (isi ada tanpa JS; 5 bila tidak ada data pengalaman).
8. Ponsel lanskap dan tablet potret: bawaannya tanpa 3D. Tablet lanskap: 3D.
9. Tab dari kolom alamat sampai form kontak, lalu Shift+Tab kembali: kontrol
   yang difokus selalu terlihat di bawah bilah atas.

## Tahap 4 — pengukuran

### Hasil lab

Build produksi (`pnpm build && pnpm start`), Chrome headless, cache mati,
median tiga kali muat. Profil ponsel: layar 390×844, CPU diperlambat 4×,
jaringan "Slow 4G" (RTT 150 ms, 1,6 Mbps). Profil desktop: 1440×900, tanpa
perlambatan.

| Halaman              | Profil  | LCP (ms) | CLS | TBT (ms) | Unduhan (KB) | di antaranya JS (KB) |
| -------------------- | ------- | -------- | --- | -------- | ------------ | -------------------- |
| `/` (beranda)        | ponsel  | 704      | 0   | 46       | 315          | 215                  |
| `/tour` (bawaan)     | ponsel  | 720      | 0   | 20       | 333          | 240                  |
| `/tour` (3D dipaksa) | ponsel  | 700      | 0   | 274      | 586          | 485                  |
| `/` (beranda)        | desktop | 112      | 0   | 0        | 315          | 215                  |
| `/tour` (bawaan, 3D) | desktop | 76       | 0   | 47       | 586          | 485                  |
| `/tour` (ringkas)    | desktop | 76       | 0   | 0        | 333          | 240                  |

Yang bisa disimpulkan:

- **Di ponsel, tur bawaan mendekati beranda:** +18 KB unduhan (di antaranya
  +25 KB JavaScript, sekitar +12%). Pengunjung ponsel tidak mengunduh three.js
  maupun scene-nya kecuali menekan tombol "3D version".
- **LCP ketiga halaman berada dalam batas derau** (700–720 ms; median tiga
  kali muat, tanpa sebaran). Tidak ada tanda tur lebih lambat tampil.
- **3D menambah ±250 KB JavaScript** dan, di mesin lab dengan CPU diperlambat,
  ±250 ms waktu blokir. Teks sudah tampil sebelum itu.
- **Tidak ada lompatan tata letak (CLS 0) di enam jalur yang diukur**, juga
  dengan pilihan tampilan tersimpan. Diukur saat muat saja.

Yang **tidak** bisa disimpulkan dari lab:

- **Laju frame di ponsel.** Chrome di mesin pengukur memakai GPU laptop;
  angkanya (60 fps) tidak berkata apa-apa soal ponsel. Ini hanya bisa diukur
  di perangkat sungguhan.
- **Waktu blokir 3D di ponsel.** Sebagian besar adalah kompilasi shader dan
  unggah tekstur, yang bergantung pada GPU dan driver. Angka ±250 ms berlaku
  untuk mesin lab; di GPU lain bisa berlipat.
- **LCP di jaringan nyata.** Server lab berada di mesin yang sama; angka di
  atas berguna untuk MEMBANDINGKAN halaman, bukan sebagai angka mutlak.
- **Jalur tanpa WebGL.** Di sana tata letak memang berganti setelah hidrasi
  (lihat "Dua tampilan, satu markup"): di desktop tanpa WebGL lompatannya
  besar (peninjau mengukur CLS 0,37). Jalur ini jarang, dan belum diperbaiki.
- **Layar selain 390×844.** Hanya satu ukuran ponsel yang diukur muatnya;
  bilah atas diperiksa terpisah di 320, 360, dan 375 px.

### Uji di ponsel sungguhan

`/tour?perf` menampilkan panel ukur kecil (hanya diunduh dengan parameter itu;
tidak ada data yang dikirim ke mana pun):

1. Buka `/tour?perf` di ponsel. Panel di kiri-bawah menampilkan laju frame.
2. Untuk mengukur 3D: tekan **3D version** di kanan atas, tunggu ruangan
   tampil, lalu **tunggu sekitar 5 detik** supaya jendela ukur saat diam
   terisi penuh.
3. Tekan **Run scroll test**. Halaman bergulir sendiri selama 12 detik.
4. Tekan **Copy** (atau salin teks di kotaknya) dan simpan laporannya.
5. Untuk pembanding tanpa 3D: **muat ulang halaman** lebih dulu, lalu ulangi
   langkah 3–4. Angka CLS dijumlahkan sejak halaman dimuat, jadi tanpa muat
   ulang angka uji kedua tercampur uji pertama.

Uji batal sendiri bila tab disembunyikan di tengah jalan (browser menghentikan
frame, dan jedanya akan terbaca sebagai sendatan). "Close" menghentikan uji
dan melepas panel.

Laporannya memuat: mode, ukuran layar dan kanvas, GPU, ukuran unduhan, dan
laju frame saat diam dan saat bergulir. Cara membacanya:

- **1% low** = laju rata-rata pada 1% frame terlama. Satu bekuan setengah
  detik di antara ratusan frame mulus menjatuhkan angka ini, walau rata-ratanya
  tetap tinggi. **worst** = frame terlama.
- **CLS (sum since load)** = jumlah semua pergeseran sejak halaman dimuat,
  tidak termasuk yang dipicu ketukan. Ini bukan definisi CLS standar (jendela
  sesi) dan tidak pernah lebih kecil darinya.
- **idle … [short window …]** = uji ditekan sebelum jendela diam (5 detik)
  penuh. Barisnya lalu didominasi sendatan saat halaman dan adegan 3D baru
  dimuat, jadi 1% low dan worst di baris itu bukan keadaan diam. Baris
  `scroll` tidak terpengaruh.
- **download … [N of M files from cache …]** = sebagian berkas diambil dari
  cache browser (kunjungan kedua, atau setelah muat ulang), jadi angkanya
  bukan ukuran unduhan penuh. Ukuran unduhan yang sah ada di tabel lab di
  atas; untuk mengukurnya di ponsel, buka di tab samaran yang baru.
- **LCP, CLS, blocked** hanya ada bila browser melaporkannya. Safari iOS
  tidak melaporkan semuanya; yang kosong ditulis `n/a`.
- Panel **tidak mengukur daya atau baterai**. Untuk itu amati sendiri: suhu
  ponsel dan turunnya baterai setelah beberapa menit di tampilan 3D.

Agar ponsel bisa menjangkau mesin pengembang di jaringan yang sama, alamat API
harus memakai IP mesin itu, bukan `localhost`:

```sh
IP=$(ipconfig getifaddr en0)          # macOS; IP mesin ini di jaringan lokal
# Backend: izinkan origin frontend lewat IP itu (tanpa mengubah .env)
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://$IP:3000" go run ./cmd/api
# Frontend: alamat API ikut tertanam saat build
NEXT_PUBLIC_API_URL="http://$IP:8080/api/v1" pnpm build && pnpm start
# Di ponsel: http://<IP>:3000/tour?perf
```

Pakai build produksi, bukan `pnpm dev` — mode pengembangan jauh lebih lambat
dan angkanya menyesatkan. Tombol Copy bisa ditolak browser di `http://`;
teksnya tetap bisa dipilih manual dari kotak laporan.

### Hasil ponsel sungguhan

Satu ponsel, 20 November 2026: GPU Adreno 740 (kelas atas), Chrome Android,
layar 384×686 @ dpr 2,81, kanvas 576×1028, lewat Wi-Fi lokal ke build
produksi. Baris `scroll` dari `/tour?perf`:

| Isi ruangan    | Tampilan | Rata-rata | 1% low   | Frame terlama | Frame lambat |
| -------------- | -------- | --------- | -------- | ------------- | ------------ |
| 1 rak          | ringkas  | 59,9 fps  | 53,0 fps | 25 ms         | 0,0%         |
| 1 rak          | 3D       | 59,9 fps  | 52,9 fps | 25 ms         | 0,0%         |
| 24 rak + arsip | ringkas  | 59,9 fps  | 50,3 fps | 33 ms         | 0,0%         |
| 24 rak + arsip | 3D       | 60,0 fps  | 53,1 fps | 25 ms         | 0,0%         |

Yang bisa disimpulkan:

- **Di ponsel ini 3D sama mulusnya dengan HTML saat bergulir**, juga dengan
  ruangan terisi maksimum. Angkanya mentok di laju layar (60 Hz), jadi sisa
  tenaganya tidak terukur.
- **Jumlah rak menambah sendatan awal, bukan beban saat bergulir.** Waktu
  blokir saat adegan pertama digambar: 86 ms dengan 1 rak, 219 ms dengan 24
  rak; frame terlama pada detik-detik pertama 183 ms lalu 300 ms. Terjadi
  sekali, setelah teks tampil.
- CLS 0 di keempat uji.

Yang **belum** terjawab:

- **Ponsel kelas menengah atau lama.** Patokan di bawah ditulis untuk kelas
  itu; satu ponsel kelas atas hanya menunjukkan batas atasnya.
- **Panas dan baterai** setelah beberapa menit di 3D (uji hanya 12 detik).
- **LCP dan ukuran unduhan di ponsel.** Lewat Wi-Fi lokal LCP 116–204 ms dan
  sebagian besar berkas datang dari cache; keduanya tidak mewakili kunjungan
  pertama di jaringan seluler.

### Usulan patokan keputusan (tahap 5)

Usulan, belum disepakati. Diukur di ponsel kelas menengah dan satu laptop
tanpa GPU khusus:

| Yang diukur                              | Dengan apa                                                            | Lolos bila                                          | Bila gagal                                  |
| ---------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| Laptop, tur 3D saat bergulir             | `/tour?perf`, baris `scroll`                                          | rata-rata ≥ 50 fps, 1% low ≥ 30 fps, worst ≤ 150 ms | Beranda tidak ditukar, atau 3D jadi pilihan |
| Ponsel, 3D atas permintaan saat bergulir | `/tour?perf`, baris `scroll`                                          | rata-rata ≥ 40 fps, slow frames ≤ 5%                | Tombol "3D version" disembunyikan di ponsel |
| Ponsel, tur bawaan (ringkas)             | PageSpeed Insights / Lighthouse pada alamat pratinjau yang ter-deploy | LCP ≤ 2,5 dtk, CLS ≤ 0,1                            | Beranda tidak ditukar                       |

Baris terakhir tidak bisa diukur lewat jaringan lokal (ponsel ke laptop di
Wi-Fi yang sama bukan 4G, dan Safari tidak melaporkan CLS); ia butuh alamat
yang bisa dijangkau dari internet.

## Belum dikerjakan

- **Tahap 4:** laju frame di ponsel kelas menengah dan di laptop tanpa GPU
  khusus lewat `/tour?perf` (baru satu ponsel kelas atas yang diukur),
  LCP/CLS dari alamat yang ter-deploy, lalu putuskan apakah beranda ditukar.
- Jalur tanpa WebGL di layar lebar masih melompat setelah hidrasi.
- **Bila ditukar (tahap 5):** cabut `noindex`, pindahkan data terstruktur dan
  intro beranda, arahkan `/tour` ke `/`.
- Belum ada objek khusus untuk "About" (sekarang pandangan dari atas ke
  deretan rak); papan keahlian bisa menyusul.
- Sorotan rak hanya untuk proyek unggulan yang kebagian rak; kamera tidak
  berpindah ke rak yang disorot.
- Belum teruji otomatis: loop render di `TourCanvas` (`useFrame`: kamera
  mengikuti keadaan tur, geseran gambar, jeda saat tab tersembunyi). Yang
  diuji adalah fungsi murninya (`tourState`, `moveDog`, `fovForAspect`);
  sisanya diperiksa lewat verifikasi manual di atas.
- Tautan "Experience" di footer tidak punya sasaran bila tidak ada data
  pengalaman.
