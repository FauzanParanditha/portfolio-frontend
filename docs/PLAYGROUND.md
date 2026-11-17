# Playground — "Server Room" (`/playground`)

Ruang server 3D tempat tiap rak adalah satu proyek. Pengunjung menggerakkan
robot anjing ke sebuah rak untuk membuka detail proyeknya. Halaman ini
**opsional**: portfolio biasa tidak bergantung padanya, dan beranda tidak
memuat satu byte pun kode 3D.

Status: **Tahap 1** (ruangan, rak proyek, klik-untuk-jalan, panel detail, pintu
masuk dari hero & navbar).

## Cara pakai

| Aksi                       | Mouse / keyboard                       | Sentuh             |
| -------------------------- | -------------------------------------- | ------------------ |
| Jalan ke suatu titik       | Klik lantai                            | Ketuk lantai       |
| Buka proyek                | Klik rak, atau pilih di daftar "Racks" | Ketuk rak / daftar |
| Jalan manual               | `W A S D` atau panah (relatif kamera)  | —                  |
| Periksa rak di depan robot | `E` atau tombol "Inspect"              | Tombol "Inspect"   |
| Putar kamera               | Seret                                  | Seret satu jari    |
| Zoom                       | Roda mouse                             | Cubit dua jari     |

## Arsitektur

```
src/app/playground/page.tsx          Server: ambil proyek, kirim ke shell
src/components/playground/
  PlaygroundShell.tsx                Klien: HUD, daftar rak, fallback, state panel
  StationPanel.tsx                   Panel detail (Radix Dialog, DOM biasa)
  scene/                             Dimuat malas (next/dynamic, ssr: false)
    PlaygroundCanvas.tsx             <Canvas>, loop simulasi, input keyboard
    Room.tsx                         Lantai, dinding, lampu, properti
    Racks.tsx                        Rak + LED + papan nama (instancing)
    RobotDog.tsx                     Model & animasi prosedural pemain
    CameraRig.tsx                    Kamera ikut/putar/zoom + hindari halangan
    textures.ts                      Tekstur Canvas 2D (tanpa berkas aset)
src/lib/playground/                  Logika murni, tanpa three.js/DOM
  grid.ts                            Grid navigasi, A*, penghalusan jalur
  collision.ts                       Tabrakan lingkaran-vs-kotak (gerak manual)
  layout.ts                          Proyek → stasiun → posisi rak → grid
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

## Catatan teknis

- **Dua model halangan, satu sumber.** `layout.obstacles` (kotak rak &
  properti) adalah sumber kebenaran. Klik-untuk-jalan mencari jalur di grid
  0,25 m yang diturunkan darinya; gerak manual (WASD) memakai tabrakan
  lingkaran-vs-kotak yang tepat, sehingga robot meluncur di sepanjang rak dan
  lewat di celah antar-rak (1,4 m).
- **Kepala tidak menembus rak.** Selain lingkaran badan ada lingkaran "hidung"
  di depannya. Tiga aturan menjaganya tanpa pernah melempar pemain:
  1. koreksi hidung per sub-langkah dibatasi sepanjang sub-langkah itu, dan
     perpindahan total tidak pernah melebihi laju jalan;
  2. putaran yang akan mengayunkan kepala ke dalam halangan dikurangi atau
     dibatalkan (robot mundur keluar dari celah sempit tanpa berputar);
  3. klik-untuk-jalan ke titik lantai berhenti sedikit lebih awal bila kepala
     akan masuk ke rak/dinding di depannya.
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

1. Klik lantai → robot berjalan memutari rak; klik rak berisi → robot datang
   lalu panel terbuka; klik rak kosong → robot datang, panel tidak terbuka.
2. `W A S D` bergerak relatif kamera dan tidak menembus rak/dinding.
3. Seret memutar kamera tanpa memicu jalan; scroll men-zoom.
4. Panel: Escape menutup; "View case study" menuju halaman proyek yang benar.
5. Lebar ponsel: tombol "Racks" membuka daftar; ketuk rak bekerja.
6. Chrome dengan `--disable-3d-apis`: muncul pesan "3D view unavailable" dan
   daftar rak tetap berfungsi.

## Belum dikerjakan (tahap berikutnya)

- Terminal status live (`/healthz`, `/readyz`) dan paket data di kabel.
- Papan timeline pengalaman dan kotak surat (form kontak).
- Teaser 3D di hero.
