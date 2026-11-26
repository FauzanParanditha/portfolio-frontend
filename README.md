# Portfolio Frontend

Frontend portfolio pribadi berbasis **Next.js 16 (App Router)**, **React 19**, dan **TypeScript**. Terdiri dari dua area:

- **Public** — halaman portfolio untuk pengunjung (`/`, `/projects`, `/projects/[slug]`).
- **Admin** — dashboard CMS untuk mengelola konten (`/admin/*`), dilindungi autentikasi JWT.

Backend (REST API) terpisah dan diakses melalui environment variable `NEXT_PUBLIC_API_URL`.

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS, Radix UI, shadcn/ui pattern, class-variance-authority |
| Data fetching | SWR + Axios |
| Form & validasi | Zod |
| Auth | Cookie HttpOnly `access_token` (dikelola backend), Axios `withCredentials` |
| Ikon & animasi | lucide-react, framer-motion |
| Notifikasi | sonner |

## Prasyarat

- **Node.js** 20+
- **pnpm** (package manager yang dipakai project ini — jangan campur dengan npm/yarn)

```bash
npm install -g pnpm
```

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Buat file `.env.local` di root project:

   ```bash
   NODE_ENV=development
   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
   ```

   > Catatan: `NEXT_PUBLIC_API_URL` **sudah termasuk** prefix `/api/v1`. Sesuaikan dengan URL backend Anda.

3. Jalankan dev server:

   ```bash
   pnpm dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `pnpm dev` | Menjalankan dev server (Turbopack) |
| `pnpm build` | Build untuk production |
| `pnpm start` | Menjalankan hasil build production |
| `pnpm lint` | Menjalankan ESLint |
| `pnpm test` | Menjalankan semua test (Vitest) |
| `pnpm cek` | Pemeriksaan statis: `tsc --noEmit` + ESLint |
| `pnpm periksa` | Gerbang rilis — jalankan sebelum mengirim perubahan |
| `pnpm audit` | Mengecek vulnerability dependensi |

### Gerbang rilis

`pnpm periksa` (= `bash tools/periksa.sh`) menjalankan semua pemeriksaan
sekaligus dan melaporkan seluruh kegagalan dalam satu putaran; CI menjalankan
skrip yang sama, ditambah `pnpm test`.

| # | Pemeriksaan | Di repo ini |
|---|---|---|
| 1 | Statis | `tsc --noEmit`, ESLint |
| 2 | Build | `pnpm build` |
| 3 | Pola berbahaya | `dangerouslySetInnerHTML`, `innerHTML =`, `insertAdjacentHTML`, `eval`, `new Function`, env `NEXT_PUBLIC_*` bernama rahasia (`SECRET`, `TOKEN`, `KEY`, …) di luar berkas test; pengecualian tertulis di `KECUALI` |
| 4 | Rahasia di yang dikirim | nama env rahasia backend dan kunci privat yang tertulis di `.next/static`, `.next/server/app`, dan `public` |
| 5 | Penjaga route | test `src/proxy.ts`: matcher menangkap seluruh `/admin`, dan tanpa cookie dilempar ke login (otorisasi sebenarnya di backend) |
| 6 | Audit dependensi | `pnpm audit --prod --audit-level moderate` |
| 7 | Uji asap | belum ada |
| 8 | Aturan kontainer | `deploy/Dockerfile` dan `deploy/docker-compose.yml`: tag image persis, non-root, `HEALTHCHECK`, `.dockerignore`, port dengan alamat ikat eksplisit |

## Struktur Project

```
src/
  app/                  # Routes (App Router)
    admin/              # Area admin (layout, provider, halaman dashboard)
    auth/login/         # Halaman login
    projects/[slug]/    # Halaman detail project public
    not-found.tsx       # Halaman 404
  context/              # AdminAuthContext (state autentikasi admin)
  components/
    ui/                 # Komponen primitive (pola shadcn/ui)
    admin/              # Komponen khusus area admin
    beauty/             # Komponen animasi/dekoratif
  hooks/                # Custom hooks (mayoritas berbasis SWR)
  lib/
    axios/              # adminClient & publicClient
    fetcher/            # Fetcher untuk SWR
    mapper/             # Konversi data UI <-> payload API
  schema/               # Skema validasi Zod
  types/                # Tipe domain & response API
  utils/                # Konstanta & helper
```

## Autentikasi (Admin)

- Login: `POST /auth/login` → token disimpan di cookie.
- Sesi dipulihkan via `GET /me`.
- Saat token kedaluwarsa (401), client mencoba `POST /auth/refresh` sekali; bila gagal, sesi dihapus dan diarahkan ke `/auth/login`.
- Proteksi route admin saat ini berjalan di sisi client (menyembunyikan UI). **Otorisasi sebenarnya wajib ditegakkan oleh backend** di setiap endpoint.

## Konvensi

- Endpoint **admin** diakses lewat `adminClient` (otomatis menyertakan token + auto-refresh).
- Endpoint **public** diakses lewat `publicClient` (tanpa token).
- Validasi form menggunakan **Zod** (lihat `src/schema/`).
- Penggabungan className memakai helper `cn()` (`src/lib/utils.ts`).
- Menu sidebar admin diatur terpusat di `src/components/admin/sidebar.config.ts`.

Untuk panduan teknis lebih lengkap (termasuk catatan keamanan & jebakan umum), lihat [CLAUDE.md](CLAUDE.md).

## Deploy & operasional

Produksi berjalan sebagai image Docker di bawah Docker Compose, dikendalikan
tiga skrip di akar repo:

| Skrip | Kegunaan |
|---|---|
| `sudo ./install.sh` | pasang pertama kali / terapkan perubahan konfigurasi runtime (aman diulang) |
| `sudo ./update.sh` | pasang versi baru (image ditarik dari GitHub); `--rollback` kembali ke versi sebelumnya |
| `sudo ./status.sh` | keadaan tiap komponen beserta sebab dan saran (`--ringkas`, `--json`) |

Image dibangun GitHub Actions (workflow `Image`) tiap ada commit di `master`,
dengan `NEXT_PUBLIC_*` dari variabel repo, lalu dipindai
(`tools/periksa-image.sh`) dan diterbitkan ke `ghcr.io`. Frontend tidak
dibangun di server: build Next.js memakai 1–2 GB memori.

Rinciannya, termasuk jebakan `NEXT_PUBLIC_*` dan cara server menjangkau API
(`API_INTERNAL_URL`), ada di [docs/PEMELIHARAAN.md](docs/PEMELIHARAAN.md).
