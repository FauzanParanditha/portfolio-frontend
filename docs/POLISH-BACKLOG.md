# Polish Backlog — Beranda Publik

Sisa pekerjaan dari audit beranda (6 September 2026). Urutannya sengaja
berdasarkan **dampak per jam**, bukan kemudahan.

Dua artifact rujukan:

- **Portfolio Siap Recruiter** — audit tujuh sasaran + bukti angka
  <https://claude.ai/code/artifact/50e97088-427b-4f28-98bd-cd7867972e58>
- **Audit Motion Portfolio** — pola motion + demo interaktif
  <https://claude.ai/code/artifact/16ce89b4-b3ec-4382-8408-d3e4602878a4>

---

## Sudah selesai

- [x] **1 — Render isi di server, buang gerbang layar pembuka.** HTML 16 KB → 60 KB;
      waktu tunggu isi 3,2 detik → 0. `WelcomeAnimation` diganti `IntroOverlay`
      yang tidak menghalangi. (commit `e158f6c`)
- [x] **2 — Perbaiki teks yang salah menggambarkan diri.** "DIGITAL DESIGNER",
      "CURATED INTERFACES", "digital realities for modern brands", "brutalist
      design", "ruthless efficiency" — semuanya hilang dari HTML. Sebutan peran
      diseragamkan jadi **"Fullstack Programmer"** (17 kemunculan) mengikuti
      pilihan yang sudah dipakai di metadata dan Navbar.

- [x] **3 — Tombol Unduh CV + LinkedIn/GitHub di hero.** Baris aksi di bawah
      headline, tampil di **semua** breakpoint. Tautan GitHub & LinkedIn memakai
      URL yang sudah ada di Footer.

Metadata (`title`, `description`, OG image, keyword) diperiksa dan **sudah benar**
— tidak perlu diubah.

- [x] **Unggah berkas di panel admin.** `POST /admin/uploads` + tombol unggah di
      form proyek (cover & screenshot). Jenis berkas ditentukan dari isinya;
      SVG ditolak karena bisa memuat skrip.
- [x] **Skill di About dari API tag.** Grid keahlian tidak lagi ditulis manual;
      disusun dari `GET /api/v1/tags` (endpoint publik baru) dan dikelompokkan
      per `type`. Menambah keahlian cukup lewat `/admin/tags`, tanpa deploy.
      14 keahlian yang dulu hardcode sudah dipindahkan ke database supaya tidak
      ada konten yang hilang — silakan pangkas yang sudah tidak relevan lewat
      panel.
- [x] **4 — Angka kredibilitas tampil di ponsel.** Kartu "Current Focus" dulu
      `hidden lg:flex`, sehingga angkanya lenyap di ponsel & tablet. Kini satu
      elemen yang sama: mengalir di bawah tombol pada layar kecil, mengambang
      di kanan mulai `lg`. Kalimat deskriptifnya tetap desktop-only — di layar
      kecil ruangnya dipakai untuk angka.
- [x] **6 — `next/image` untuk gambar proyek.** Tag `<img>` mentah di
      `ProjectsSection` dan `/projects` diganti; `unoptimized` tanpa syarat di
      `projects/[slug]` diganti keputusan per gambar. Daftar host dipusatkan di
      `src/lib/imageHosts.ts` sehingga izin di `next.config.ts` dan keputusan di
      komponen tidak bisa melenceng.
- [x] **7 — `public/videos/hero.mp4` (20 MB) dihapus.** Tidak dirujuk berkas mana
      pun. `public/` turun 20 MB → 280 KB.
- [x] **8 — Animasi tak berujung.** Ternyata sebagian besar sudah beres sendiri
      sebagai efek samping nomor 1; sisanya kode mati. Lihat catatan di bawah.
- [x] **9 — Reveal berbasis CSS.** `opacity: 0` inline di HTML: **19 → 0**.
      Seluruh isi kini terlihat tanpa menunggu JavaScript. About, Experience,
      dan Projects sekalian jadi komponen server; Navbar lepas dari
      framer-motion, sehingga **tidak ada satu pun komponen di jalur beranda
      yang mengimpor framer-motion lagi**.
- [x] **12 — Motion "WOW".** Overlay hover kartu proyek, timeline lengket di
      Experience, dan parallax cover — **ketiganya murni CSS**, tanpa
      mengembalikan framer-motion ke jalur beranda. Lenis sengaja dilewati.
- [x] **5 — Target sentuh navigasi ponsel.** Empat tautan `text-xs` berjajar
      diganti tombol 44×44 + panel berisi tautan setinggi minimal 44 px dan
      selebar penuh. Panel selalu ada di DOM (disembunyikan atribut `hidden`)
      supaya `aria-controls` menunjuk elemen yang benar-benar ada.
- [x] **13 — `/projects` dirender di server.** Kata kunci, filter tag, dan nomor
      halaman pindah ke URL. HTML 18,5 KB tanpa kartu → 34,3 KB berisi kartu.
      Filter tag kini dikerjakan **database** (param `tag` baru di backend);
      versi lama menyaring satu halaman di browser sehingga memfilter di halaman
      2 dengan tag yang hanya ada di halaman 1 menghasilkan kosong.
- [x] **15 — `/projects/[slug]` dirender di server.** HTML 16,7 KB (metadata saja)
      → 50,2 KB berisi seluruh studi kasus. Slug tak dikenal kini **404**, bukan
      halaman 200 bertulisan "Project not found". Pengambilan data ganda
      (layout + page) disatukan. Ikut menemukan bug tipe `screenshots` — lihat
      catatan 15b.
- [x] **Kontak diperbaiki.** Telepon sebelumnya masih placeholder `+62` dengan
      tautan ke `wa.me/62` yang tidak valid, dan "Location" menaut ke situs
      kantor. Kini dari env, dan baris WhatsApp disembunyikan bila kosong.

> ⚠️ **Butuh tindakan Anda:** tombol "Download CV" hanya muncul bila
> `NEXT_PUBLIC_CV_URL` diisi. Taruh berkas CV di `public/cv/` lalu set
> path-nya di `.env.local` (contoh ada di `.env.example`). Selama kosong,
> tombolnya sengaja disembunyikan agar recruiter tidak mendarat di 404 —
> dan `next dev` akan mengingatkan lewat peringatan di konsol.
>
> Kini ada jalan pintas: unggah PDF CV lewat tombol unggah mana pun di form
> proyek admin (backend menerima PDF), salin URL yang dibalas, lalu tempel ke
> `NEXT_PUBLIC_CV_URL`. Tombol unggah khusus CV belum dibuat.

> ⚠️ **Butuh tindakan Anda juga:** isi `NEXT_PUBLIC_CONTACT_PHONE` di
> `.env.local` supaya baris WhatsApp muncul kembali. Nilainya dipakai untuk
> teks sekaligus tautan `wa.me` (karakter non-angka dibuang otomatis).

---

## Berat halaman

---

## Sisa teknis dari langkah 1

### 9b. Tipe tag baru butuh ikon

`AboutSection` memetakan tipe tag ke ikon lewat `ICON_BY_TYPE`. Tipe yang belum
terdaftar jatuh ke ikon generik dan tetap tampil — tidak rusak, hanya kurang
khas. Kalau menambah tipe baru di `/admin/tags` (mis. `mobile`, `testing`),
tambahkan juga ikonnya di peta tersebut.

Perlu diketahui: perubahan tag baru muncul di beranda dalam **maksimal 5 menit**
(`revalidate = 300` di `app/page.tsx`), bukan seketika.

### 10. `src/hooks/use-experiences.ts` jadi kode mati

Beranda tadinya satu-satunya pemakai. Sengaja tidak dihapus — mungkin berguna
kalau nanti ada halaman `/experience` tersendiri. Hapus kalau memang tidak.

### 11. `CLAUDE.md` selalu dirty

`next dev` dan `next build` menambahkan blok `<!-- BEGIN:nextjs-agent-rules -->`
setiap kali dijalankan. Dua pilihan: commit sekali supaya tree bersih, atau
matikan lewat `agentRules: false` di `next.config.ts`.

---

## Belum dikerjakan

### 14. `src/components/ui/pagination.tsx` jadi kode mati

Paginasi `/projects` kini memakai `<Link>` biasa (bisa dibuka di tab baru,
di-crawl, jalan tanpa JavaScript), sehingga komponen shadcn ini tanpa pemakai.
**Sengaja tidak dihapus** — ia primitif design-system yang wajar dipakai lagi
untuk tabel admin. Hapus kalau memang tidak.

Diperiksa (9 September 2026): nol pemakai terkonfirmasi. Halaman admin
`contact-messages` ternyata memakai tombol Sebelumnya/Berikutnya buatan sendiri,
bukan komponen ini — jadi ia belum pernah dipakai bahkan sebelum item 13.

Dua hook SWR yang ikut jadi kosong sudah dihapus (`use-projects.ts`,
`use-experiences.ts`): keduanya menduplikasi jalur pengambilan data yang kini
ditangani `src/lib/server/portfolio.ts`, dan dua jalur akses data ke API yang
sama adalah beban pemeliharaan, bukan cadangan.

### 15b. Bug yang ikut ketemu: tipe `screenshots` salah

Saat menguji galeri, ternyata API publik mengembalikan `screenshots` sebagai
**objek** `{imageUrl, sortOrder}`, sementara `src/types/portfolio.ts`
mendeklarasikannya `string[]`. Kode lama memakai `src={screenshot}` langsung,
yang akan menghasilkan `[object Object]`.

Tidak pernah terlihat karena satu-satunya proyek di database tidak punya
screenshot. Sudah diperbaiki: tipe FE disesuaikan dengan
`ProjectScreenshotResponse` di backend, dan halaman memetakan objek → URL
sekaligus mengurutkannya sesuai `sortOrder`.

Pelajarannya: **tipe TypeScript yang ditulis manual bukan jaminan.** Tidak ada
yang memverifikasi bahwa `types/portfolio.ts` cocok dengan DTO Go. Kalau nanti
ingin dijamin, hasilkan tipe FE dari `docs/swagger.json`.

## Dependensi yang sengaja ditahan

- **TypeScript 7.0.2** — lolos `tsc`, test, dan build, tapi **mematikan
  `pnpm lint`** sepenuhnya: typescript-eslint belum mendukung TS 7 (dukungan
  ditargetkan TS ≥ 7.1, typescript-eslint#10940). Bertahan di **6.0.3**.
- **ESLint 10.10.0** — belum dinaikkan; `eslint-config-next@16.3.4` masih
  berpasangan dengan ESLint 9.
- **Cek visual Tailwind 4 + ikon brand lokal** — build, lint, dan 52 test hijau,
  tapi tampilan halaman utama, footer, dan area admin belum pernah dilihat mata
  manusia setelah migrasi.
