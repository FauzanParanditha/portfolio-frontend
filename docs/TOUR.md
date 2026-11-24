# Tur ruang server (beranda, `/`)

Seluruh isi portfolio sebagai kartu yang digulir, dengan ruang server 3D di
belakangnya. Menggulir halaman menggerakkan kamera dan robot dari satu
perhentian ke perhentian berikutnya. Sejak tahap 5 ini **beranda situs**.

Bedanya dengan `/playground`: di sana pengunjung menggerakkan robot sendiri
(jelajah bebas); di sini cukup menggulir, dan semua isi terbaca tanpa harus
"bermain". Keduanya memakai ruangan dan komponen scene yang sama.

## Posisi di rencana lima tahap

| Tahap | Isi                                                        | Status                                                     |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| 1     | Playground: ruangan, rak proyek, robot                     | Selesai                                                    |
| 2     | Tiga stasiun di `/playground` + endpoint status di backend | Selesai                                                    |
| 3     | Tur dengan scroll, sebagai pratinjau di `/tour`            | Selesai                                                    |
| 4     | Uji di ponsel sungguhan dan ukur kecepatan muat            | Selesai, kecuali LCP di jaringan seluler (lihat "Tahap 4") |
| 5     | Tukar beranda ke tur                                       | Selesai (lihat "Tahap 5")                                  |

## Tahap 5 — beranda ditukar

| Alamat        | Isi                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------- |
| `/`           | Tur ruang server. Metadata bawaan root layout: canonical `/`, boleh diindeks.                 |
| `/tour`       | Alamat pratinjau lama: dialihkan ke `/` (307, sementara; kueri seperti `?perf` ikut).         |
| `/classic`    | Beranda lama, disimpan selama masa pembandingan. `noindex`, di luar sitemap, tidak ditautkan. |
| `/playground` | Tidak berubah.                                                                                |

Yang ditambahkan ke tur supaya tidak kalah dari beranda lama:

- **Menu perhentian** di bilah atas (tombol + panel, `.tour-menu`): tampil di
  mana rel tidak tampil — ponsel dan tata letak ringkas — karena di sana tidak
  ada cara lain untuk melompat antar-bagian. Memuat tautan ke tiap perhentian
  dan ke `/playground`. Menggantikan penghitung "04 / 06" di ponsel.
- **Jalur kontak langsung** di kartu Contact (surel, WhatsApp bila nomornya
  diisi, lokasi), dari `CONTACT_CHANNELS` di `src/content/profile.ts` — sumber
  yang sama dengan beranda lama.
- **Intro pembuka** (`IntroOverlay`) tampil di atas tur pada kunjungan pertama
  tiap sesi. Penanda sesinya kini skrip inline di `<head>` (dulu
  `<Script beforeInteractive>`, yang baru berjalan setelah paint pertama
  sehingga intro bisa berkedip di kunjungan kedua).

`/classic` sengaja dipertahankan: LCP di jaringan seluler belum pernah diukur,
dan dengan dua halaman di alamat yang ter-deploy keduanya bisa dibandingkan
langsung (PageSpeed Insights pada `/` dan `/classic`). Ia juga jalan mundur
yang murah. Setelah angkanya ada, hapus `/classic` beserta komponen yang hanya
dipakainya (`HeroSection`, `AboutSection`, `ExperienceSection`,
`ProjectsSection`, `ContactSection`, `Navbar`).

Angka lab sesudah ditukar (build produksi, muat dingin, median 3 kali; ponsel
= 390×844, CPU 4×, Slow 4G; database berisi 25 proyek, jadi ruangan penuh):

| Halaman    | Profil  | LCP (ms) | CLS | TBT (ms) | Total (KB) | JS (KB) |
| ---------- | ------- | -------- | --- | -------- | ---------- | ------- |
| `/`        | ponsel  | 820      | 0   | 141      | 316        | 224     |
| `/classic` | ponsel  | 932      | 0   | 211      | 333        | 238     |
| `/`        | desktop | 204      | 0   | 325      | 558        | 469     |
| `/classic` | desktop | 204      | 0   | 0        | 344        | 238     |

- **Ponsel:** beranda baru tidak lebih lambat dan tidak lebih berat dari yang
  lama (bawaannya HTML tanpa 3D).
- **Desktop:** LCP sama, tetapi 3D menambah ±215 KB dan ±325 ms waktu blokir
  saat ruangan penuh pertama kali digambar (unduh, kompilasi, dan pemanasan
  adegan). Itu terjadi setelah teks tampil. Angka 47 ms di tabel "Hasil lab"
  tahap 4 diukur dengan satu rak dan sebelum pemanasan adegan ada.
- Alat ukurnya berbeda dari tabel tahap 4 (skrip dan versi Chrome lain), jadi
  bandingkan baris dalam tabel ini saja, bukan antartabel.

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
src/app/page.tsx                 Server: ambil semua data, kirim ke shell
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
- **Blur latar hanya di tata letak 3D dengan `pointer: fine`** (penunjuk
  utamanya mouse atau trackpad), lewat `.tour-glass`. Ponsel dan tablet tanpa
  mouse tidak mendapatkannya, tata letak ringkas tidak pernah. Perangkat
  hibrida (laptop layar sentuh, tablet ber-mouse) tetap mendapat blur. Jangan
  menambahkan `backdrop-blur-*` lewat kelas utilitas di komponen mana pun yang
  dirender di dalam tur (dijaga test untuk `TourShell` dan komponen isinya).
- **Pekerjaan berat dijauhkan dari tengah gulir.**
  - Hasil status yang tiba tidak memanggil `Intl`, dan pada jalur biasa
    (operational / degraded) tidak mengubah tinggi kartunya: tabel sudah
    dirender, kalimat waktu dan petunjuk penyegaran berada di baris
    masing-masing. Keadaan `limited` dan `unavailable` masih menambah satu
    paragraf.
  - Geometri dan tekstur objek yang terlihat diunggah ke GPU sebelum kanvas
    tampil (`warmUpScene`). Pengecualian: objek `visible={false}` (cahaya
    sorot rak, baru diunggah saat proyek pertama disorot) dan layar terminal,
    yang diunggah ulang tiap status berubah.
- **Selalu ada cara melompat antar-bagian:** rel di tata letak 3D layar lebar,
  menu di bilah atas selain itu (ditentukan CSS, saling eksklusif).

## Verifikasi manual

Jalankan backend + `pnpm dev`, buka `/`:

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
7. `curl -s localhost:3000/ | grep -o 'class="tour-stop"' | wc -l` → 6
   (isi ada tanpa JS; 5 bila tidak ada data pengalaman).
8. Ponsel lanskap dan tablet potret: bawaannya tanpa 3D. Tablet lanskap: 3D.
9. Tab dari kolom alamat sampai form kontak, lalu Shift+Tab kembali: kontrol
   yang difokus selalu terlihat di bawah bilah atas.
10. Lebar ponsel (atau "Simple version" di desktop): tombol menu di bilah atas
    membuka daftar perhentian; memilih satu menutup menu dan menggulir ke
    sana; Escape menutup dan mengembalikan fokus ke tombol. Di desktop 3D
    tombol itu tidak ada (rel yang tampil).
11. Kunjungan pertama di sesi baru: intro "PARANDITHA" menutupi layar lalu
    hilang sendiri; muat ulang → tidak tampil lagi, tanpa kedipan.
12. `/tour` mengalihkan ke `/`; `/classic` menampilkan beranda lama.

## Tahap 4 — pengukuran

### Hasil lab

Diukur saat tur masih pratinjau di `/tour`, dengan database berisi satu
proyek (satu rak). Untuk angka sesudah ditukar dan dengan ruangan penuh, lihat
"Tahap 5" di atas.

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

`/?perf` menampilkan panel ukur kecil (hanya diunduh dengan parameter itu;
tidak ada data yang dikirim ke mana pun):

1. Buka `/?perf` di ponsel. Panel di kiri-bawah menampilkan laju frame.
2. Untuk mengukur 3D: tekan **3D version** di kanan atas dan tunggu ruangan
   tampil.
3. Tekan **Run scroll test**. Tombolnya baru aktif 5 detik setelah halaman
   dimuat atau tampilan diganti (panel menulis "Warming up"), supaya sendatan
   awal tidak terekam sebagai sendatan saat bergulir. Halaman lalu bergulir
   sendiri selama 12 detik.
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
- **idle … [short window …]** = jendela diam (5 detik) belum penuh saat uji
  dimulai, jadi 1% low dan worst di baris itu didominasi sendatan awal.
  Tombol uji menunggu 5 detik, jadi catatan ini seharusnya tidak muncul lagi;
  bila muncul, frame sempat terhenti (mis. tab baru kembali dari latar).
- **download … [N of M files from cache …]** = sebagian berkas diambil dari
  cache browser (kunjungan kedua, atau setelah muat ulang), jadi angkanya
  bukan ukuran unduhan penuh. Ukuran unduhan yang sah ada di tabel lab di
  atas; untuk mengukurnya di ponsel, buka di tab samaran yang baru.
- **scroll … worst N ms at P%** = frame terlama terjadi di P% perjalanan
  gulir. Uji bergulir dengan laju tetap, jadi P menunjuk tempatnya di halaman
  — titik awal untuk mencari penyebab sebuah sendatan.
- **long frame at P%: N ms (script … via …, layout …)** = frame di atas 50 ms
  selama uji gulir, terlama lebih dulu, **paling banyak empat**, menurut
  `long-animation-frame` browser.
  - `script` = total waktu skrip; `via` = pemanggil skrip terlamanya.
    `MessagePort.onmessage` biasanya render React, `Response.json.then` hasil
    fetch, `FrameRequestCallback` callback `requestAnimationFrame` apa pun
    (loop gambar three.js, tetapi juga loop panel ini sendiri dan pembaca
    posisi gulir). `in` = berkas chunk-nya, yang bisa dicari di
    `.next/static/chunks` build yang sama.
  - `layout` = gaya + tata letak di akhir frame saja; tata letak yang dipaksa
    di tengah skrip tidak terhitung di sini.
  - **`script 0 ms, layout 0 ms`** = jedanya bukan di kode maupun tata letak:
    tahap menggambar (paint, compositor, GPU). Begitulah sendatan blur
    terlihat.
  - Frame panjang di baris `scroll` yang tidak punya baris ini belum tentu di
    luar utas utama: bisa juga karena lebih dari empat frame panjang.
  - `P` di sini dihitung dari awal frame, sedangkan `worst … at P%` di baris
    `scroll` dari akhirnya; frame yang sama bisa tertulis selisih ±2%.
  - `long frames: n/a` = browser tidak mendukungnya (Safari, Firefox).
- **backdrop blur: none / on (N elements)** = berapa elemen tur yang
  benar-benar digambar dengan `backdrop-filter` saat uji.
- **backdrop blur: off (experiment)** = uji dijalankan dengan tombol **No blur**
  di panel menyala, yang mematikan `backdrop-filter` di seluruh tur. Dipakai
  untuk membandingkan: bila frame panjang hilang tanpa blur, kartu ber-blur di
  atas kanvaslah penyebabnya di perangkat itu. Hanya berlaku selama panel
  terbuka.
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
# Di ponsel: http://<IP>:3000/?perf
```

Pakai build produksi, bukan `pnpm dev` — mode pengembangan jauh lebih lambat
dan angkanya menyesatkan. Tombol Copy bisa ditolak browser di `http://`;
teksnya tetap bisa dipilih manual dari kotak laporan.

### Hasil ponsel sungguhan

Dua ponsel, 20 November 2026, Chrome Android, lewat Wi-Fi lokal ke build
produksi. Baris `scroll` dari `/?perf`, ruangan terisi maksimum (24 rak +
arsip) kecuali disebut lain:

| Ponsel (GPU)            | Tampilan  | Rata-rata | 1% low   | Frame terlama | Frame lambat |
| ----------------------- | --------- | --------- | -------- | ------------- | ------------ |
| Kelas atas (Adreno 740) | ringkas   | 59,9 fps  | 50,3 fps | 33 ms         | 0,0%         |
| Kelas atas (Adreno 740) | 3D        | 60,0 fps  | 53,1 fps | 25 ms         | 0,0%         |
| Kelas atas (Adreno 740) | 3D, 1 rak | 59,9 fps  | 52,9 fps | 25 ms         | 0,0%         |
| Menengah (Adreno 710)   | ringkas   | 59,1 fps  | 28,2 fps | 50 ms         | 0,3%         |
| Menengah (Adreno 710)   | 3D        | 58,3 fps  | 16,1 fps | 242 ms        | 0,4%         |

Kedua baris ponsel menengah diukur **sebelum** perbaikan di bawah. Sesudahnya,
3D di ponsel itu: 59,9 fps, 1% low 55,9 fps, frame terlama 25 ms, tanpa frame
di atas 50 ms. Yang terbukti menghilangkan sendatannya di ponsel adalah
pencabutan blur; lihat catatan di tiap bagian.

Yang bisa disimpulkan:

- **Rata-rata lolos patokan di kedua ponsel**, juga dengan ruangan penuh
  (≥ 40 fps, frame lambat ≤ 5%). Tetapi patokan itu terlalu longgar: uji yang
  membeku 0,24 detik pun lolos. Lihat usulan patokan di bawah.
- **Di ponsel kelas atas, jumlah rak menambah sendatan awal dan tidak terlihat
  menambah beban saat bergulir.** Waktu blokir saat adegan pertama digambar:
  86 ms dengan 1 rak, 219 ms dengan 24 rak. Angka bergulirnya mentok di laju
  layar (60 Hz) pada keduanya, jadi selisih beban yang lebih kecil dari itu
  tidak akan terlihat; ponsel menengah tidak diuji dengan 1 rak.
- **Sendatan awal di ponsel menengah:** waktu blokir 388–457 ms, dengan satu
  frame membeku ±0,5 detik. Terjadi sekali, setelah teks tampil, dan hanya bila
  pengunjung ponsel memilih "3D version".
- **Kunjungan pertama di ponsel menengah:** 239 KB JavaScript (lab: 240) dan
  347 KB total (lab: 333), LCP 944 ms lewat Wi-Fi.
- CLS 0 di semua uji.

#### Sendatan saat hasil status tiba (ditemukan di lab)

Dicari karena ponsel menengah menunjukkan satu frame 242 ms di 3D; posisinya
di gulir tidak tercatat (laporan waktu itu belum menyebutnya). Di lab (CPU
diperlambat 6×) ada sendatan di kedua tampilan, selalu di ±40% gulir — saat
pengunjung mendekati kartu status dan hasil pemeriksaan pertama tiba. Tiga
penyebab, semuanya diperbaiki:

| Penyebab                                                                                                     | Perbaikan                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `toLocaleTimeString()` di baris "Checked at …": panggilan pertamanya memuat data lokal browser (±100 ms @6×) | `formatClock` — jam `HH:MM:SS` tanpa `Intl`                                  |
| Kartu status memanjang saat hasil tiba, memaksa seluruh halaman ditata ulang (±120 ms @6×)                   | Tabel dan baris waktu sudah dirender berisi tanda tunggu; tinggi kartu tetap |
| Geometri dan tekstur objek yang baru masuk pandangan diunggah ke GPU saat itu juga (60 buffer, 4 tekstur)    | `warmUpScene`: satu render tanpa pemangkasan frustum sebelum kanvas tampil   |

Sesudahnya, di lab: tidak ada frame di atas 40 ms di kedua tampilan (sebelumnya
100 ms di 3D dan sampai 360 ms di ringkas, @6×), dan satu-satunya unggahan GPU
di tengah gulir adalah layar terminal yang digambar ulang.

**Yang terbukti hanya di lab.** Lab memakai GPU laptop, jadi bagian GPU-nya
terbukti lewat hitungan unggahan, bukan lewat waktu. Di ponsel, efek tiga
perbaikan ini tidak bisa dipisahkan dari blur: sesudahnya ponsel menengah
masih 209 dan 167 ms (lihat bawah), dan tampilan ringkasnya memang tidak
pernah menunjukkan sendatan sebesar di lab (50 ms). Frame 242 ms tadi bisa
saja sepenuhnya akibat blur. Satu hal yang berubah di ponsel: sesudah
perbaikan ini tidak ada lagi frame panjang yang dilaporkan di sekitar 40%.

#### Blur latar di atas kanvas (ditemukan dari ponsel menengah)

Setelah perbaikan di atas, ponsel menengah masih menunjukkan frame 167 dan
209 ms di 3D (dua uji). Baris `long frame` di laporan memisahkannya: empat frame terpanjang
(di 10%, 12%, 76%, 77% gulir) semuanya `script 0 ms, layout 0 ms` — bukan kode,
bukan tata letak — dan posisinya tepat saat dua kartu tertinggi (About,
Contact) memenuhi layar. Uji banding di ponsel yang sama, 3D, ruangan penuh:

| `backdrop-filter`             | Rata-rata | 1% low   | Frame terlama | Frame lambat | Frame panjang (> 50 ms)  |
| ----------------------------- | --------- | -------- | ------------- | ------------ | ------------------------ |
| menyala (8 elemen)            | 57,1 fps  | 10,5 fps | 167 ms        | 1,0%         | 4 dilaporkan: 102–175 ms |
| dimatikan (tombol panel)      | 59,9 fps  | 59,5 fps | 17 ms         | 0,0%         | tidak ada                |
| dihapus lewat CSS (build ini) | 59,9 fps  | 55,9 fps | 25 ms         | 0,0%         | tidak ada                |

Satu pasang uji, tetapi ketiga uji 3D dengan blur di ponsel itu bersendatan
(242, 209, 167 ms; baris "menyala" di atas adalah yang terakhir). Kartu
ber-blur di atas kanvas yang terus bergerak harus dihitung ulang tiap frame.

Catatan angka: "8 elemen" termasuk rel yang tersembunyi di ponsel, jadi yang
digambar 7 (hitungan panel sejak itu melewati elemen `display: none`). "Frame
terlama" memakai selang `requestAnimationFrame`, "frame panjang" memakai
durasi `long-animation-frame`; dua jam berbeda, jadi 167 ms dan 175 ms bisa
merujuk frame yang sama.

Perbaikan: permukaan kartu, bilah atas, dan rel memakai kelas `.tour-glass`
(globals.css) — 95% pekat **tanpa** blur secara bawaan, bilah atas pekat
penuh. Kaca buram (85% + `blur(12px)`) hanya berlaku di tata letak 3D pada
perangkat yang penunjuk utamanya halus (`pointer: fine`: mouse, trackpad).
Ponsel dan tablet tanpa mouse tidak mendapatkannya, juga bila memilih 3D;
tata letak ringkas tidak pernah, karena di belakang kartunya tidak ada apa-apa
untuk diburamkan. Laptop layar sentuh dan tablet ber-mouse tetap mendapat
blur.

Yang **belum** terjawab:

- **Laptop ber-GPU lemah** (termasuk Chromebook ARM). Desktop tetap memakai
  blur di 3D; di laptop pengukur tidak ada frame panjang, tetapi GPU
  terintegrasi yang lemah belum diuji. Tombol **No blur** di panel bisa
  dipakai untuk uji banding di sana.
- **Ponsel yang lebih lemah** dari Adreno 710.
- **Panas dan baterai** setelah beberapa menit di 3D (uji hanya 12 detik).
- **LCP di jaringan seluler.** Lewat Wi-Fi lokal angkanya tidak mewakili.

### Patokan

Usulan yang dipakai selama tahap 4; tidak pernah disepakati secara resmi.
Diukur di ponsel kelas menengah dan satu laptop tanpa GPU khusus:

| Yang diukur                              | Dengan apa                                             | Lolos bila                                                               | Hasil                                           |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Laptop, tur 3D saat bergulir             | `/?perf`, baris `scroll`                               | rata-rata ≥ 50 fps, 1% low ≥ 30 fps, worst ≤ 150 ms                      | Belum diukur di laptop tanpa GPU khusus         |
| Ponsel, 3D atas permintaan saat bergulir | `/?perf`, baris `scroll` dan `long frame`              | rata-rata ≥ 40 fps, 1% low ≥ 30 fps, worst ≤ 100 ms, tanpa frame panjang | Lolos di Adreno 740 dan 710 (sesudah perbaikan) |
| Ponsel, tur bawaan (ringkas)             | PageSpeed Insights / Lighthouse pada alamat ter-deploy | LCP ≤ 2,5 dtk, CLS ≤ 0,1                                                 | Belum diukur; lab: LCP 820 ms, CLS 0            |

Baris ponsel 3D semula hanya "rata-rata ≥ 40 fps, frame lambat ≤ 5%". Itu
diperketat karena uji ber-blur yang membeku 167–242 ms lolos patokan lama.

Baris terakhir tidak bisa diukur lewat jaringan lokal (ponsel ke laptop di
Wi-Fi yang sama bukan 4G, dan Safari tidak melaporkan CLS); ia butuh alamat
yang bisa dijangkau dari internet. Beranda ditukar sebelum angka itu ada —
keputusan pemilik situs — dengan `/classic` sebagai pembanding dan jalan
mundur.

## Belum dikerjakan

- **LCP/CLS dari alamat yang ter-deploy**, untuk `/` dan `/classic`; lalu
  hapus `/classic` dan komponen yang hanya dipakainya.
- **Laju frame di laptop tanpa GPU khusus** lewat `/?perf` (desktop memakai
  blur di 3D).
- Jalur tanpa WebGL di layar lebar masih melompat setelah hidrasi.
- Panel ukur: berkas yang direvalidasi (304) tidak terhitung "dari cache".
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
