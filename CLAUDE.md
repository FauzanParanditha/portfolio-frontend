# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repo ini. Dibaca otomatis setiap sesi.

## Ringkasan Project

Frontend portfolio pribadi berbasis **Next.js 16 (App Router) + React 19 + TypeScript**.
Terdiri dari dua area:

- **Public** — halaman portfolio yang dilihat pengunjung (`/`, `/projects`, `/projects/[slug]`).
- **Admin** — dashboard CMS untuk mengelola konten (`/admin/*`), dilindungi auth JWT via **HttpOnly cookie** (`access_token`).

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
- Endpoint **admin** → selalu lewat `adminClient` ([src/lib/axios/admin.ts](src/lib/axios/admin.ts)) (`withCredentials: true` → cookie `access_token` dikirim otomatis + auto-refresh saat 401).
- Endpoint **public** → lewat `publicClient` ([src/lib/axios/public.ts](src/lib/axios/public.ts)) (tanpa token; login mengirim `withCredentials` per-request agar `Set-Cookie` diterima).
- Bentuk response API **seragam** (unified envelope, dikonfirmasi backend 2026-06): semua sukses = `{ data: <payload> }`, list menambah `{ data: [...], meta: {...} }` dengan `meta.totalPages`. **Termasuk `login` & `/me`** (token di `res.data.data.token`, user di `res.data.data`).

### Auth (admin) — cookie-based (HttpOnly)
Auth memakai **cookie HttpOnly `access_token`** yang di-set backend. Karena HttpOnly, **JS tidak bisa & tidak boleh membaca/menulis token**. Browser mengirim cookie otomatis lewat `withCredentials: true`. **Jangan** simpan/lampirkan token via JS (tidak ada `js-cookie`/`cookies-next` untuk access token, tidak ada `Authorization: Bearer` manual).
- **Login**: `POST /auth/login` (dengan credentials) → backend men-set cookie `access_token` (HttpOnly, Path=/, SameSite=Lax, Secure di prod). Body memang berisi `{ data: { token, tokenType, expiresIn } }` tapi **diabaikan** (token tidak disimpan). Status auth ditentukan dengan memanggil `GET /me`.
- **Restore sesi** (saat load): `GET /me` (cookie dikirim otomatis). Sukses → user diisi ke state React (in-memory); `401` → tidak terautentikasi.
- **Refresh saat 401**: `adminClient` memanggil `POST /auth/refresh` **sekali** (cookie dikirim otomatis, tanpa header manual; backend merotasi cookie). Sukses → ulangi request asli. Gagal → `POST /auth/logout` (best-effort), bersihkan state user in-memory, redirect ke `/auth/login`.
- **Logout**: `POST /auth/logout` (dengan credentials) agar backend menghapus cookie → bersihkan state user → redirect `/auth/login`. **Jangan** coba hapus cookie via JS (HttpOnly).
- User object disimpan di **React state/context (in-memory)** — hanya token yang pindah ke cookie HttpOnly.
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

- **Jangan** simpan/baca access token via JS sama sekali (tidak di `localStorage`/`sessionStorage`/`cookies-next`). Access token = cookie **HttpOnly** yang dikelola backend; cukup andalkan `withCredentials`.
- **Jangan** ulang prefix `/api/v1` pada path request (lihat catatan Environment).
- **Jangan** pakai `react-router` — ini Next.js App Router (navigasi: `next/link`, `next/navigation`).
- File 404 = `app/not-found.tsx` (konvensi Next.js), bukan `404.tsx`.
- Setelah mengubah dependensi, jalankan `pnpm build` dan `pnpm audit` untuk verifikasi.
- Komentar & UI string banyak berbahasa Indonesia — ikuti konteks file yang sedang diedit.

## Koordinasi dengan Backend

Backend = repo terpisah **`../go-portfolio-backend`** (Go). Agent tidak berkomunikasi langsung — koordinasi lewat file di **`../go-portfolio-backend/docs/`** (hub bersama):

- **`API-CONTRACT.md`** — sumber kebenaran kontrak API (envelope, kode error, pagination, daftar endpoint). Baca ini sebelum menambah/mengubah pemanggilan API. Swagger interaktif: `http://localhost:8080/swagger/index.html` (non-produksi).
- **`NOTES-FOR-FRONTEND.md`** — pesan dari backend untuk FE. **Baca di awal sesi.**
- **`NOTES-FOR-BACKEND.md`** — channel balasan FE → backend. **Tulis di sini** bila ada yang perlu disampaikan/diminta.
- **`SECURITY.md`** — perilaku auth & catatan keamanan backend.

Aturan:
1. Jangan edit `API-CONTRACT.md` atau migration backend secara sepihak.
2. Usulan perubahan kontrak ditulis dulu di notes file, lalu disepakati bersama.
3. `API-CONTRACT.md` di-update bersama (manual oleh developer yang menjaga).

> Catatan: envelope sukses **seragam** = `{ data }` (objek) / `{ data, meta }` (list) untuk SEMUA endpoint, termasuk `login` (`{ data: { token, tokenType, expiresIn } }`) dan `/me`. `meta` punya `totalPages`. Error = `{ error: { message, code, details }, requestId }`. `/admin/*` butuh JWT + role `admin` (401 vs 403 dibedakan). Auth admin via cookie HttpOnly `access_token`: `POST /auth/login` set cookie, `POST /auth/refresh` rotasi cookie, `POST /auth/logout` hapus cookie (backend juga masih menerima Bearer header, tapi browser hanya andalkan cookie).

## Catatan Keamanan

Item keamanan yang perlu dikoordinasikan dengan backend ditulis di
`../go-portfolio-backend/docs/NOTES-FOR-BACKEND.md`. Baca itu + `SECURITY.md` backend
sebelum menyentuh alur auth / penyimpanan token.
