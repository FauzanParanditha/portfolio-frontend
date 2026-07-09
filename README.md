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
| `pnpm audit` | Mengecek vulnerability dependensi |

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

## Deploy

Project ini dapat di-deploy ke [Vercel](https://vercel.com/) atau platform lain yang mendukung Next.js. Pastikan environment variable `NEXT_PUBLIC_API_URL` dikonfigurasi di environment production.
