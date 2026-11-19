# Playground — "Server Room" (`/playground`)

Ruang server 3D tempat tiap rak adalah satu proyek. Pengunjung menggerakkan
robot anjing ke sebuah rak untuk membuka detail proyeknya. Halaman ini
**opsional**: portfolio biasa tidak bergantung padanya, dan beranda tidak
memuat satu byte pun kode 3D.

Status: **Tahap 2**. Tahap 1 = ruangan, rak proyek, klik-untuk-jalan, panel
detail, pintu masuk dari hero & navbar. Tahap 2 menambah tiga stasiun di lobi:

| Stasiun     | Objek di ruangan               | Panelnya berisi                              | Tanpa JS / tanpa 3D             |
| ----------- | ------------------------------ | -------------------------------------------- | ------------------------------- |
| Live status | Meja + monitor (kode `API`)    | Jawaban `/healthz` & `/readyz` saat itu juga | Tombol (disembunyikan tanpa JS) |
| Experience  | Papan di dinding barat (`LOG`) | Riwayat kerja dari `/experiences`            | Tautan ke `/#experience`        |
| Contact     | Kotak surat (`MSG`)            | Form kontak yang sama dengan beranda         | Tautan ke `/#contact`           |

Ruangan dan komponen scene yang sama dipakai tur dengan scroll di `/tour`
(calon beranda) — lihat [TOUR.md](TOUR.md).

## Cara pakai

| Aksi                       | Mouse / keyboard                            | Sentuh           |
| -------------------------- | ------------------------------------------- | ---------------- |
| Jalan ke suatu titik       | Klik lantai                                 | Ketuk lantai     |
| Buka proyek / stasiun      | Klik rak atau perabot, atau pilih di daftar | Ketuk / daftar   |
| Jalan manual               | `W A S D` atau panah (relatif kamera)       | —                |
| Periksa rak di depan robot | `E` atau tombol "Inspect"                   | Tombol "Inspect" |
| Putar kamera               | Seret                                       | Seret satu jari  |
| Zoom                       | Roda mouse                                  | Cubit dua jari   |

## Arsitektur

```
src/app/playground/page.tsx          Server: ambil proyek & pengalaman, kirim ke shell
src/components/playground/
  PlaygroundShell.tsx                Klien: HUD, daftar rak, fallback, state panel
  StationPanel.tsx                   Panel detail (Radix Dialog, DOM biasa)
  HealthSummary.tsx                  Pil + tabel status (dipakai juga oleh tur)
  ExperienceList.tsx                 Daftar riwayat kerja (dipakai juga oleh tur)
  SceneBoundary.tsx                  Menangkap kegagalan scene → tampilan cadangan
src/components/contact/ContactForm.tsx  Form kontak; dipakai beranda & panel kotak surat
src/hooks/use-backend-health.ts      SWR: periksa status backend dari browser
src/hooks/use-environment.ts         WebGL, gerak dikurangi, tab tersembunyi
  scene/                             Dimuat malas (next/dynamic, ssr: false)
    PlaygroundCanvas.tsx             <Canvas>, loop simulasi, input keyboard
    Room.tsx                         Lantai, dinding, lampu, properti
    Racks.tsx                        Rak + LED + papan nama (instancing)
    Fixtures.tsx                     Terminal, papan pengalaman, kotak surat
    RobotDog.tsx                     Model & animasi prosedural pemain
    CameraRig.tsx                    Kamera ikut/putar/zoom + hindari halangan
    textures.ts                      Tekstur Canvas 2D (tanpa berkas aset)
    performance.tsx                  Resolusi adaptif, deteksi perangkat lemah
src/lib/playground/                  Logika murni, tanpa three.js/DOM
  grid.ts                            Grid navigasi, A*, penghalusan jalur
  collision.ts                       Tabrakan lingkaran-vs-kotak (gerak manual)
  layout.ts                          Proyek → stasiun → posisi rak & perabot → grid
  health.ts                          Klasifikasi jawaban /healthz & /readyz
  sim.ts                             Gerak pemain (rute + WASD + tabrakan)
```

Prinsip yang dijaga:

- **Semua yang bisa dibaca/diklik adalah DOM.** Daftar rak berisi tautan asli
  ke `/projects/[slug]` dan sudah ada di HTML dari server. Tanpa WebGL atau
  dengan pembaca layar, semua proyek tetap terjangkau; tanpa JavaScript,
  blok `<noscript>` menampilkan daftar itu langsung (juga di layar kecil).
  Kanvas hanyalah lapisan visual (`aria-hidden`).
- **Fokus & pengumuman.** Memilih rak mengumumkan "Walking to rack …" lewat
  wilayah `aria-live`. Setelah panel ditutup fokus kembali ke pemicunya:
  tautan rak (bila dibuka dari daftar), tombol "Inspect", atau halaman itu
  sendiri bila dibuka dari scene — supaya tombol panah tetap menggerakkan
  robot.
- **Logika terpisah dari gambar.** `src/lib/playground` tidak mengimpor
  three.js, jadi pathfinding, tata letak, dan gerak diuji langsung di Vitest.
  Scene hanya membaca hasilnya.
- **Tanpa aset eksternal.** Model, tekstur, dan tulisan dibuat di browser.
  Tidak ada glTF, font, atau CDN.
- **Dependensi minimal:** `three` dan `@react-three/fiber` saja (tanpa drei,
  tanpa pustaka fisika — lantainya datar, A* di grid sudah cukup).

## Stasiun (tahap 2)

- **Satu daftar tujuan.** `layout.targets` = rak (`layout.slots`) diikuti
  perabot (`layout.fixtures`); `targets[i].index === i`. Indeks itu dipakai di
  mana-mana (perintah jalan, "sudah tiba", sorotan, panel). Tiap tujuan membawa
  titik berdiri (`approach`) dan arah hadap (`face`) sendiri — rak menghadap
  utara, dinding pengalaman ke barat, kotak surat ke kamera.
- **Status live itu sungguhan.** Browser pengunjung memanggil
  `${NEXT_PUBLIC_API_URL}/healthz` dan `/readyz` (endpoint backend di bawah
  `/api/v1`, PR backend `feat/health-api`). Yang ditampilkan hanya
  operational / degraded / unavailable + waktu pulang-pergi; backend sengaja
  tidak membuka sebabnya. Waktu `/readyz` **bukan** latensi database (hasilnya
  di-memo 5 dtk di backend), jadi tidak diberi label seperti itu.
  - Jeda pemeriksaan: 60 dtk untuk monitor di ruangan, 10 dtk selama panel
    status terbuka, berhenti saat tab tersembunyi. Batas backend 60/menit per
    IP; pemakaian terbanyak 12/menit.
  - Saat panel dibuka dan hasil terakhir sudah berumur ≥ 5 dtk, status
    langsung diperiksa ulang — teks panel menyebutnya "right now".
  - `429` → jeda kembali ke 60 dtk sampai backend menjawab lagi.
  - Tanpa scene (tanpa WebGL) status baru diperiksa saat panelnya dibuka —
    termasuk di render hidrasi pertama, saat browser belum tahu WebGL-nya.
  - Backend lama tanpa endpoint itu (404) atau tidak terjangkau → "Unavailable"
    dengan tenang, tanpa toast. `429` → "Checking paused".
  - Memakai `fetch` langsung (tanpa kredensial, batas waktu 5 dtk yang
    mencakup pembacaan isi), bukan `publicClient`, supaya interceptor axios
    tidak memunculkan toast galat.
  - Hasil diumumkan ke pembaca layar lewat `role="status"` pada pil status.
- **Dinding pengalaman** hanya ada bila `/experiences` mengembalikan data;
  paling banyak tiga papan digambar, panelnya memuat semua entri.
- **Form kontak** adalah komponen yang sama dengan beranda
  (`ContactForm variant="panel"`): batas panjang, 422, dan 429 ditangani di
  satu tempat. Draf disimpan di `StationPanel` selama halaman terbuka, jadi
  menutup panel (Escape, klik di luar) tidak menghapus ketikan; draf
  dikosongkan setelah pesan terkirim.
- **Isi panel bisa digulir dengan keyboard:** wadah gulirnya `role="region"`
  ber-`tabIndex={0}` dan menjadi fokus awal saat panel terbuka.
- **Kamera digeser di layar lebar.** Daftar rak menutupi 312 px di kiri, jadi
  gambar digeser separuhnya ke kanan (`setViewOffset`); tanpa itu dinding barat
  jatuh tepat di balik daftar.

## Catatan teknis

- **Dua model halangan, satu sumber.** `layout.obstacles` (kotak rak &
  properti) adalah sumber kebenaran. Klik-untuk-jalan mencari jalur di grid
  0,25 m yang diturunkan darinya; gerak manual (WASD) memakai tabrakan
  lingkaran-vs-kotak yang tepat, sehingga robot meluncur di sepanjang rak dan
  lewat di celah antar-rak (1,4 m).
- **Kepala tidak tertahan di dalam rak.** Selain lingkaran badan ada lingkaran
  "hidung" di depannya. Aturannya sengaja sederhana — dua percobaan yang lebih
  ketat (melarang putaran ke arah halangan, dan menghentikan rute lebih awal)
  dicoba lalu dibuang karena membuat arah hadap membeku dan klik "termakan":
  1. **Saat bergerak (WASD):** bagian gerak yang mendorong kepala makin dalam
     dibuang, lalu badan digeser mundur paling banyak sejauh langkah itu
     sendiri. Menabrak rak lurus dari depan berhenti dengan hidung di muka rak.
  2. **Saat diam:** bila kepala (atau badan) masih menindih halangan — mis.
     baru tiba lewat klik di dekat dinding — robot mundur selangkah (paling
     jauh ±0,7 m) sampai bebas.
  3. **Arah hadap dan rute tidak pernah dibatasi.** Robot selalu menghadap
     arah geraknya dan selalu sampai tepat di titik yang diklik.

  Konsekuensinya, dari pengukuran (60 fps):
  - Kepala boleh masuk ke halangan **sekejap** saat berbelok di dekat dinding
    atau tepat saat tiba: paling lama ±0,6 dtk sebelum robot bebas lagi
    (±0,7 dtk di 10 fps).
  - Klik lantai yang ujung rutenya kurang dari ±0,8 m dari halangan sering
    (±40–50%) berakhir dengan robot mundur 0,2–0,6 m. Untuk klik acak di
    seluruh ruangan itu sekitar satu dari empat.
  - Tabrakan tidak memindahkan pemain lebih cepat dari laju jalannya. Satu
    pengecualian: rute diikuti di grid, jadi badan bisa tiba menindih
    geometri tepat sampai ±8 cm. Saat diam tindihan itu dikeluarkan bertahap;
    bila tombol WASD ditekan tepat saat tiba, ia dikeluarkan sekaligus.

- **Kepala keluar di sisi badannya.** Kotak surat hanya setebal 0,5 m: kepala
  yang masuk lebih dari separuhnya punya "sisi keluar terdekat" di seberang.
  `resolveCircle` menerima jangkar (pusat badan) dan MENCORET sisi di seberang
  sisi masuk dari kandidat, lalu mengambil yang terdekat dari sisanya.
  Dicoret, bukan ditukar setelah terpilih: versi "tukar" membuat dua
  pemeriksaan berurutan memilih sisi berlawanan tepat di garis seri, dan robot
  lari di tempat. Ditemukan lewat sapuan 300 benih di ruangan berperabot (enam
  benih bawaan lolos semua) dan sapuan rapat pose di sekitar kotak surat, yang
  kini menjadi test tetap.
- **Belum teruji otomatis:** pemakaian indeks tujuan di dalam
  `PlaygroundCanvas` (kanvas selalu ditiru di test). Diperiksa lewat
  verifikasi manual di bawah.
- **Tidak ada kantong buntu.** Celah properti-ke-dinding yang lebih sempit
  dari 1,2 m ditutup (kotak halangannya diperpanjang sampai dinding). Celah
  seperti itu muat untuk gerak manual tetapi tertutup di grid, sehingga rute
  dari dalamnya bisa memotong menembus properti.
- **Kapasitas:** paling banyak 24 rak berisi. Bila proyek lebih dari itu, rak
  terakhir menjadi "Project archive" yang menautkan ke `/projects`. Ruangan
  minimal dua baris; slot tanpa proyek tampil sebagai rak kosong.
- **Gerak dikurangi** (`prefers-reduced-motion`): memilih rak dari daftar
  memindahkan robot seketika dan langsung membuka panel; kedip LED dan
  gerak-gerik diam dimatikan.
- **Performa:** rak, LED, dan pendar lantai memakai instancing. Render berhenti
  (`frameloop="demand"`) saat panel terbuka atau tab tersembunyi. Resolusi
  turun otomatis bila FPS jatuh (batasnya disimpan di state dan diteruskan
  lewat prop `dpr`, karena `<Canvas>` menerapkan ulang prop itu tiap render); bayangan dimatikan di perangkat sentuh /
  ber-core sedikit.
- **Ukuran:** chunk 3D ± 245 KB gzip, hanya diunduh di `/playground`. Tautan
  dari hero & navbar memakai `prefetch={false}`.
- **Versi three dikunci di `~0.182`.** r183+ menandai `THREE.Clock` usang,
  sementara @react-three/fiber 9.8 masih memakainya — hasilnya peringatan di
  konsol tiap kunjungan. Naikkan bersamaan saat fiber sudah beralih ke
  `THREE.Timer`.
- **Keamanan:** tautan demo/repo di panel melewati `safeHttpUrl`; cover lewat
  `ProjectImage` (`safeImageSrc`). Slug di-`encodeURIComponent`.

## Verifikasi manual

Jalankan backend + `pnpm dev`, buka `/playground`, lalu periksa:

0. Daftar "Stations": Live status → robot ke meja, panel menampilkan
   Operational dengan dua baris; matikan backend → dalam 10 dtk berubah
   Unavailable. Experience → papan di dinding barat terlihat (tidak tertutup
   daftar). Contact → form terkirim dan muncul di admin.
1. Klik lantai → robot berjalan memutari rak; klik rak berisi → robot datang
   lalu panel terbuka; klik rak kosong → robot datang, panel tidak terbuka.
2. `W A S D` bergerak relatif kamera dan tidak menembus rak/dinding.
3. Seret memutar kamera tanpa memicu jalan; scroll men-zoom.
4. Panel: Escape menutup; "View case study" menuju halaman proyek yang benar.
5. Lebar ponsel: tombol "Racks" membuka daftar; ketuk rak bekerja.
6. Chrome dengan `--disable-3d-apis`: muncul pesan "3D view unavailable" dan
   daftar rak tetap berfungsi.

## Belum dikerjakan (tahap berikutnya)

- Paket data di kabel dan animasi rak saat status berubah.
- Tur dengan scroll sudah ada di `/tour` (tahap 3); pengukuran di perangkat
  sungguhan dan keputusan menukar beranda ada di [TOUR.md](TOUR.md).
