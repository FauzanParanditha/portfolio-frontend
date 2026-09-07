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

## Prioritas tinggi — masih menyentuh sasaran recruiter

### 4. Tampilkan angka kredibilitas di ponsel · ~1 jam

`HeroSection.tsx` — kartu "Current Focus" memakai `hidden lg:flex`, jadi
**5+ Years / 30+ Features / 99% Uptime hilang total di ponsel dan tablet**,
justru di perangkat yang paling sering dipakai recruiter memindai.

Sekalian ganti metriknya. "30+ Features" tidak berarti apa-apa; yang bisa
diperiksa jauh lebih kuat — mis. cakupan test handler backend **76%**
(dari commit `7d14e80` di repo go-portfolio-backend).

### 5. Perbesar target sentuh navigasi ponsel · ~1–2 jam

`Navbar.tsx` — versi mobile memakai empat tautan `text-xs` berjajar. Target
sentuhnya jauh di bawah 44 px yang direkomendasikan. Perlu menu yang layak
disentuh.

Sebagian dari item ini sudah tersentuh saat mengerjakan nomor 3: hero diubah
dari `h-screen` ke `min-h-svh` supaya bisa tumbuh saat isinya bertambah dan
tidak melompat ketika bilah alamat browser ponsel muncul-hilang. Navigasinya
sendiri belum disentuh.

---

## Berat halaman

### 6. Pakai `next/image` untuk gambar proyek · ~2–3 jam

`ProjectsSection.tsx` dan `app/projects/page.tsx` masih memakai tag `<img>`
mentah — tidak ada penyesuaian ukuran maupun WebP. Untuk portfolio berisi
tangkapan layar, ini beban terbesar.

Solusinya **bukan** `unoptimized` (yang dipakai di `projects/[slug]`), melainkan
mendaftarkan host gambar di `next.config.ts` → `images.remotePatterns`.

**Sudah tidak terhalang lagi.** Host backend kini otomatis terdaftar di
`remotePatterns` (diturunkan dari `NEXT_PUBLIC_API_URL`, dibatasi ke
`/uploads/**`), jadi gambar yang diunggah lewat panel admin sudah boleh melewati
optimasi. Sisa pekerjaannya: ganti tag `<img>` mentah di `ProjectsSection` dan
`app/projects/page.tsx` dengan `next/image`, lalu buang `unoptimized` di
`projects/[slug]`.

### 7. Hapus `public/videos/hero.mp4` · 5 menit

20 MB dan **tidak dirujuk berkas mana pun**. Tidak memperlambat pengunjung
(karena tak pernah diunduh), tapi ikut terbawa di setiap deploy.

### 8. Kurangi animasi tak berujung · ~1 jam

Hero menjalankan `TypewriterLoop` dan `TextGenerateEffectLoop` bersamaan,
selamanya. Sisakan satu. Loop yang terus berjalan menahan CPU ponsel tetap
aktif dan membuat halaman terasa gelisah.

---

## Sisa teknis dari langkah 1

### 9. Section di bawah lipatan masih `opacity: 0` inline

`AboutSection`, `ExperienceSection`, `ProjectsSection`, `ContactSection` memakai
`initial="hidden"` + `useInView` dari framer-motion, sehingga HTML-nya memuat
`style="opacity:0"`.

**Teksnya ada di HTML** — crawler dan SEO sudah aman, itu kegagalan intinya dan
sudah beres. Yang tersisa: section-section itu masih blank secara visual sampai
React terhidrasi.

Perbaikannya: reveal berbasis CSS (`animation-timeline: view()` dengan
`@supports` yang jatuh ke "selalu terlihat"), sama seperti `rise-in` yang sudah
dipakai hero. Bisa digabung dengan pekerjaan motion di bawah.

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

## "WOW" — kerjakan paling akhir

### 12. Pindahkan kejutan ke dalam isi · ~3–4 jam

Semua pola sudah dirinci dan **didemokan interaktif** di artifact Audit Motion.
Yang paling tinggi rasio hasil terhadap usahanya:

| Pola | API framer-motion | Target |
| ---- | ----------------- | ------ |
| Overlay hover kartu proyek | `whileHover` + `variants` | `ProjectsSection.tsx`, `projects/page.tsx` |
| Parallax cover | `useScroll` + `useTransform` | `projects/[slug]/page.tsx` |
| Sticky timeline | `useScroll` + CSS sticky | `ExperienceSection.tsx` |
| Smooth scroll | pustaka Lenis | `app/layout.tsx` |

Catatan hasil pemindaian: `whileHover`, `whileTap`, `useScroll`, `useTransform`,
`useSpring`, `useMotionValue`, dan `layoutId` **belum pernah dipakai sama sekali**
di repo ini. Seluruh separuh scroll- dan pointer-linked dari framer-motion masih
kosong — di situlah semua "rasa mahal" template Framer berada.

Kalau menambah Lenis: uji ulang anchor `#about`, `#experience`, `#projects`,
`#contact` di Navbar, dan pastikan mundur ke gulir normal saat
`prefers-reduced-motion`.

---

## Dependensi yang sengaja ditahan

- **TypeScript 7.0.2** — lolos `tsc`, test, dan build, tapi **mematikan
  `pnpm lint`** sepenuhnya: typescript-eslint belum mendukung TS 7 (dukungan
  ditargetkan TS ≥ 7.1, typescript-eslint#10940). Bertahan di **6.0.3**.
- **ESLint 10.10.0** — belum dinaikkan; `eslint-config-next@16.3.4` masih
  berpasangan dengan ESLint 9.
- **Cek visual Tailwind 4 + ikon brand lokal** — build, lint, dan 52 test hijau,
  tapi tampilan halaman utama, footer, dan area admin belum pernah dilihat mata
  manusia setelah migrasi.
