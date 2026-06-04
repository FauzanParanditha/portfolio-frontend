// Deklarasi tipe untuk import aset gambar statis (mis. `import img from "@/assets/x.jpg"`).
//
// Normalnya disediakan oleh `next-env.d.ts` (via `next/image-types/global`), tetapi
// `next-env.d.ts` di-gitignore dan hanya tergenerate saat `next dev`/`next build` —
// sehingga TIDAK ada di CI yang hanya menjalankan `tsc --noEmit`. File ini di-commit
// agar deklarasi modul gambar tersedia di CI tanpa perlu build penuh.
//
// Merujuk sumber yang sama dengan next-env.d.ts → tipe (StaticImageData) konsisten,
// tidak konflik dengan next/image.
/// <reference types="next/image-types/global" />
