# Tur ruang server (`/tour`)

Seluruh isi portfolio sebagai kartu yang digulir, dengan ruang server 3D di
belakangnya. Menggulir halaman menggerakkan kamera dan robot dari satu
perhentian ke perhentian berikutnya. Ini calon pengganti beranda; saat ini
masih **pratinjau** di `/tour`.

Bedanya dengan `/playground`: di sana pengunjung menggerakkan robot sendiri
(jelajah bebas); di sini cukup menggulir, dan semua isi terbaca tanpa harus
"bermain". Keduanya memakai ruangan dan komponen scene yang sama.

## Posisi di rencana lima tahap

| Tahap | Isi                                                        | Status                         |
| ----- | ---------------------------------------------------------- | ------------------------------ |
| 1     | Playground: ruangan, rak proyek, robot                     | Selesai                        |
| 2     | Tiga stasiun di `/playground` + endpoint status di backend | Selesai                        |
| 3     | Tur dengan scroll di `/tour` (dokumen ini)                 | Selesai, menunggu review/merge |
| 4     | Uji di ponsel sungguhan dan ukur kecepatan muat            | Belum                          |
| 5     | Tukar beranda ke tur — hanya bila angka tahap 4 bagus      | Belum (titik keputusan)        |

Selama masih pratinjau, `/tour` ber-`noindex`, canonical-nya ke `/`, tidak
masuk sitemap, dan tidak ditautkan dari beranda. Beranda (`/`) tidak berubah.

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

| Tampilan | Kapan menjadi bawaan                                            | Isinya                                        |
| -------- | --------------------------------------------------------------- | --------------------------------------------- |
| 3D       | Layar ≥ 768 px **dan** tidak meminta gerak dikurangi            | Tiap perhentian setinggi layar, kartu di kiri |
| Ringkas  | Ponsel, `prefers-reduced-motion`, tanpa WebGL, tanpa JavaScript | Kartu bertumpuk di tengah, tanpa kanvas       |

- **Bawaannya ditentukan CSS, bukan JavaScript** (`globals.css`, blok "Tur
  ruang server"). HTML dari server sudah berada di tata letak yang benar,
  jadi halaman tidak melompat saat React terhidrasi.
- Tombol **Simple version / 3D version** di bilah atas menimpa bawaan itu.
  Pilihannya disimpan di `localStorage` (`tour-mode`) dan dipasang sebagai
  `data-mode` pada `.tour`.
- Tanpa WebGL atau bila scene gagal dimuat: `data-mode="simple"` dipaksa dan
  tombolnya disembunyikan.
- Kode 3D (three.js + scene) baru diunduh bila tampilan 3D benar-benar
  dipakai; pengunjung ponsel tidak mengunduhnya sama sekali kecuali menekan
  tombolnya.

## Arsitektur

```
src/app/tour/page.tsx            Server: ambil semua data, kirim ke shell
src/components/tour/
  TourShell.tsx                  Klien: kartu, bilah atas, rel, posisi gulir,
                                 pilihan tampilan, status backend
  TourCanvas.tsx                 Dimuat malas: <Canvas>, kamera & robot
                                 digerakkan posisi gulir
src/lib/tour/                    Logika murni, tanpa three.js/DOM
  tour.ts                        Perhentian, jalur robot, keadaan pada
                                 `progress`, posisi gulir → `progress`
  mode.ts                        Pilihan tampilan (localStorage)
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

1. `TourShell` mengukur titik tengah tiap bagian (diukur ulang saat ukuran
   berubah) dan, tiap halaman digulir, menghitung `progress` dengan
   `progressAt`: tepat di tengah bagian ke-k nilainya k, di antaranya linear.
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
- **Robot tidak menembus apa pun, kamera tidak masuk ke dalam rak** — diuji
  untuk 0–24 rak, dengan dan tanpa dinding pengalaman.
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
7. `curl -s localhost:3000/tour | grep -c "<section"` → 6 (isi ada tanpa JS).

## Belum dikerjakan

- **Tahap 4:** ukur di ponsel sungguhan (LCP, ukuran unduhan, FPS, daya) dan
  putuskan apakah beranda ditukar.
- **Bila ditukar (tahap 5):** cabut `noindex`, pindahkan data terstruktur dan
  intro beranda, arahkan `/tour` ke `/`.
- Belum ada objek khusus untuk "About" (sekarang pandangan dari atas ke
  deretan rak); papan keahlian bisa menyusul.
- Sorotan rak hanya untuk proyek unggulan yang kebagian rak; kamera tidak
  berpindah ke rak yang disorot.
