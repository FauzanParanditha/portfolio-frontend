# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repo ini. Dibaca otomatis setiap sesi.

## Ringkasan Project

Frontend portfolio pribadi berbasis **Next.js 16 (App Router) + React 19 + TypeScript**.
Terdiri dari dua area:

- **Public** — halaman portfolio yang dilihat pengunjung (`/`, `/projects`, `/projects/[slug]`).
- **Admin** — dashboard CMS untuk mengelola konten (`/admin/*`), dilindungi auth JWT.

Backend terpisah (REST API), diakses lewat `NEXT_PUBLIC_API_URL`.

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `pnpm dev` | Dev server (Turbopack) di http://localhost:3000 |
| `pnpm build` | Production build — **pakai ini untuk verifikasi perubahan** |
| `pnpm start` | Jalankan hasil build |
| `pnpm lint` | ESLint |
| `pnpm audit` | Cek vulnerability dependensi |

Package manager: **pnpm** (ada `pnpm-lock.yaml` dan `pnpm-workspace.yaml`). Jangan pakai npm/yarn.

## Environment

- Konfigurasi via `.env.local` (gitignored, tidak di-commit).
- Variabel: `NEXT_PUBLIC_API_URL` (mis. `http://localhost:8080/api/v1`).
- ⚠️ **`NEXT_PUBLIC_API_URL` sudah termasuk prefix `/api/v1`**. Jadi path request di axios client **tidak boleh** mengulang prefix itu — pakai `/auth/refresh`, bukan `/v1/auth/refresh`.

## Arsitektur & Konvensi

Alias import: `@/` → `src/`.

```
src/
  app/                  # Routes (App Router). not-found.tsx untuk 404 (BUKAN 404.tsx).
    admin/              # Area admin (layout + provider + halaman)
    auth/login/         # Halaman login
    projects/[slug]/    # Detail project public
  context/              # AdminAuthContext (state auth admin)
  components/
    ui/                 # Primitives (Radix + CVA + Tailwind), pola shadcn/ui
    admin/              # Komponen khusus admin (Sidebar, TopBar, dll)
    beauty/             # Komponen animasi/dekoratif
  hooks/                # Custom hooks, mayoritas berbasis SWR
  lib/
    axios/              # adminClient & publicClient (instance axios)
    fetcher/            # Fetcher SWR (bungkus axios client)
    mapper/             # Konversi bentuk data UI <-> payload API
    handleAxiosError.ts # Handler error axios terpusat (toast)
    utils.ts            # cn() — gabung className (clsx + tailwind-merge)
  schema/               # Skema validasi Zod (mis. loginSchema)
  types/                # Tipe domain & tipe response API
  utils/var.ts          # Konstanta (nama cookie token, dll)
```

### Data fetching
- **SWR** untuk semua data fetching. Hook tipikal mengembalikan `{ data, isLoading, error, mutate }` plus aksi CRUD (`createOne`/`updateOne`/`deleteOne`) yang memanggil `mutate()` setelah sukses. Lihat [src/hooks/use-admin-projects.ts](src/hooks/use-admin-projects.ts) sebagai pola acuan.
- Endpoint **admin** → selalu lewat `adminClient` ([src/lib/axios/admin.ts](src/lib/axios/admin.ts)) (otomatis menyertakan token + auto-refresh saat 401).
- Endpoint **public** → lewat `publicClient` ([src/lib/axios/public.ts](src/lib/axios/public.ts)) (tanpa token).
- Bentuk response API yang diasumsikan: list = `{ data: [...], meta: {...} }`, item = `{ data: {...} }`. (Banyak komentar `// asumsi backend...` di kode — konfirmasi ke backend bila ragu.)

### Auth (admin)
- Login: `POST /auth/login` → backend balikkan `token` → disimpan ke cookie (nama dari `jwtConfig.admin.accessTokenName` di [src/utils/var.ts](src/utils/var.ts)).
- Sesi dipulihkan dengan `GET /me`.
- 401 → `adminClient` mencoba `POST /auth/refresh` sekali; gagal → hapus cookie, redirect ke `/auth/login`.
- Proteksi route admin saat ini **client-side** ([src/components/AdminGuard.tsx](src/components/AdminGuard.tsx) + cek `user` di [src/app/admin/layout.tsx](src/app/admin/layout.tsx)). Ini hanya menyembunyikan UI — keamanan nyata wajib ditegakkan backend.

### UI / Styling
- **Tailwind CSS** (v3.4) + `cn()` dari [src/lib/utils.ts](src/lib/utils.ts) untuk menggabung class.
- Komponen `ui/` mengikuti pola **shadcn/ui** (Radix + class-variance-authority). Saat butuh primitive baru, ikuti gaya file yang sudah ada.
- Ikon: `lucide-react`. Animasi: `framer-motion`. Toast/notif: `sonner` + hook `use-toast`.
- Menu sidebar admin: tambah/ubah hanya di [src/components/admin/sidebar.config.ts](src/components/admin/sidebar.config.ts).

### Validasi & Error
- Validasi form pakai **Zod** ([src/schema/](src/schema/)). Ekspor juga tipe via `z.infer`.
- Error API: pakai `handleAxiosError()` ([src/lib/handleAxiosError.ts](src/lib/handleAxiosError.ts)) agar pesan konsisten lewat toast. `adminClient`/`publicClient` juga sudah memunculkan toast otomatis di interceptor — hati-hati jangan sampai dobel toast.

## Aturan / Hindari

- **Jangan** simpan token di `localStorage`/`sessionStorage` — pakai cookie (lewat `cookies-next`).
- **Jangan** ulang prefix `/api/v1` pada path request (lihat catatan Environment).
- **Jangan** pakai `react-router` — ini Next.js App Router (navigasi: `next/link`, `next/navigation`).
- File 404 = `app/not-found.tsx` (konvensi Next.js), bukan `404.tsx`.
- Setelah mengubah dependensi, jalankan `pnpm build` dan `pnpm audit` untuk verifikasi.
- Komentar & UI string banyak berbahasa Indonesia — ikuti konteks file yang sedang diedit.

## Koordinasi dengan Backend

Frontend & backend dikerjakan terpisah. Agent tidak berkomunikasi langsung — koordinasi lewat file:

- **Baca** `docs/NOTES-FOR-FRONTEND.md` di awal sesi (kabar/endpoint baru dari backend).
- **Tulis** ke `docs/NOTES-FOR-BACKEND.md` bila ada yang perlu disampaikan/diminta ke backend.

> Kedua file notes ini **lokal-only (gitignored)** karena memuat kontrak internal & catatan keamanan — jangan dipublikasikan.

Aturan:
1. Jangan edit `API-CONTRACT.md` atau migration secara sepihak.
2. Usulan perubahan kontrak ditulis dulu di notes file, lalu disepakati bersama.
3. `API-CONTRACT.md` di-update bersama (manual oleh developer yang menjaga).

## Catatan Keamanan

Daftar utang teknis keamanan & item yang perlu dikoordinasikan dengan backend disimpan di
`docs/NOTES-FOR-BACKEND.md` (lokal-only, tidak di-commit). Baca file itu sebelum menyentuh
alur auth / penyimpanan token.
