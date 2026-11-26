# Pemeliharaan frontend

Dokumen ini menjawab: **bagaimana memasang, memperbarui, dan memeriksa situs
di server — dan apa yang harus dilakukan saat ia mati atau tampil tanpa data?**

Backend punya dokumen yang sama di repo-nya (`docs/PEMELIHARAAN.md`); topologi
domain, cookie, dan reverse proxy ada di `docs/DEPLOYMENT.md` repo backend.

## Ringkasan perintah

Semua dijalankan dari akar repo di server.

| Keperluan | Perintah |
|---|---|
| Pasang pertama kali, atau terapkan perubahan konfigurasi runtime | `sudo ./install.sh` |
| Apakah berjalan? Kalau tidak, salahnya di mana? | `sudo ./status.sh` |
| Pasang versi terbaru (image ditarik dari GitHub) | `sudo ./update.sh` |
| Menerapkan `NEXT_PUBLIC_*` baru | ubah variabel repo di GitHub → jalankan ulang workflow `Image` → `sudo ./update.sh` |
| Pasang tag/cabang/commit tertentu | `sudo ./update.sh --ref=<ref>` |
| Kembali ke versi sebelumnya | `sudo ./update.sh --rollback` |
| Versi aktif dan sebelumnya | `sudo ./update.sh --status` |
| Hentikan / nyalakan | `sudo systemctl stop\|start portfolio-frontend` |
| Log | `docker logs --tail 100 -f portfolio-frontend-web-1` |

`status.sh` keluar dengan `0` normal, `1` terganggu, `2` mati, `3` tidak bisa
memeriksa; `--ringkas` dan `--json` untuk cron dan pemantau.

## 1. Arsitektur singkat

Satu kontainer `web`: image `portfolio-frontend/web:<versi>` berisi keluaran
*standalone* Next.js, berjalan sebagai pengguna `node` dengan akar hanya-baca,
terjangkau di `ALAMAT_IKAT:PORT_WEB`. Tidak ada database dan tidak ada data
yang perlu dicadangkan: semuanya berasal dari backend.

Berkas: `deploy/docker-compose.yml` (stack), `deploy/.env` (konfigurasi, izin
600, tidak masuk git), `deploy/.versi`, `deploy/.sidik-build`, dan
`deploy/docker-compose.override.yml` (ditulis skrip, jangan disunting).

Jangan menjalankan `docker compose up` polos di `deploy/`, dan jangan
`sudo git pull`: skrip yang memilih versi image dan menarik kode sebagai
pemilik folder.

**Pemilik folder repo setara root.** Unit systemd menjalankan skrip dari folder
ini sebagai root. Clone sebagai root di `/opt/portfolio-frontend`, atau
perlakukan akun pemiliknya seperti akun root. `install.sh` memperingatkan bila
pemiliknya bukan root.

### Jebakan yang perlu diketahui sebelum memasang

- **Image dibangun di GitHub, bukan di server.** Build Next.js memakai 1–2 GB
  memori; di server kecil yang juga menjalankan layanan lain itu membuat
  seluruh server macet. Jangan membangun frontend di server: `--bangun-lokal`
  DITOLAK bila memori tersedia di bawah 2 GB. Bila GitHub tidak terjangkau,
  biarkan versi yang sekarang berjalan.
- **`NEXT_PUBLIC_*` disisipkan saat build**, jadi nilainya berasal dari
  **variabel repo di GitHub**, bukan dari `deploy/.env` server. Yang ditulis di
  `deploy/.env` adalah nilai yang *diharapkan* server ini; `status.sh`
  melaporkan "Konfigurasi build" bila image yang berjalan dibangun dengan nilai
  lain.
- **Server Next.js harus bisa menjangkau API.** Isi halaman (proyek,
  pengalaman) dan sitemap diambil oleh server, dari DALAM kontainer. Alamat
  publik API belum tentu terjangkau dari sana — untuk itu ada
  `API_INTERNAL_URL`. Ia dipakai dua kali: saat BUILD (halaman di-prerender
  dengan data) dan saat runtime (regenerasi; boleh diubah tanpa build ulang).
  Bila tidak terjangkau, situs tetap tampil tetapi **tanpa data** pada muatan
  pertama, dan `status.sh` melaporkan "Backend (dari kontainer web)". Jangan
  menaruh kredensial di URL itu.
- **Backend di server yang sama:** `127.0.0.1` server TIDAK terjangkau dari
  kontainer. Ikat port backend ke alamat jembatan Docker (lihat
  `ip -4 addr show docker0`, biasanya `172.17.0.1`) dengan `ALAMAT_IKAT` di
  `deploy/.env` backend, lalu di sini:
  `API_INTERNAL_URL=http://host.docker.internal:<PORT_API>/api/v1`.
  Alamat itu tidak dirutekan dari internet, tetapi terjangkau semua kontainer
  lain di server ini.
- **Port yang dipublikasikan Docker melewati UFW/CSF.** `ALAMAT_IKAT=0.0.0.0`
  membuka port web ke internet apa pun aturan firewall-nya. Bawaan `127.0.0.1`.
- Saat berganti versi, situs tidak terjangkau beberapa detik.

## 2. Log

`docker logs portfolio-frontend-web-1` — 5 berkas × 20 MB. Baris
`[portfolio] gagal mengambil …` berarti server tidak bisa menjangkau API.

## 3. Pembaruan dan jalan mundur

Tiap commit di `master` dibangun workflow `Image`
(`.github/workflows/image.yml`): bangun → pindai isi image → uji nyala →
terbitkan ke `ghcr.io/fauzanparanditha/portfolio-frontend` bertanda SHA commit.

Alurnya: gabungkan PR ke `master` → tunggu workflow `Image` hijau → di server
`sudo ./update.sh` (tarik kode → lengkapi `deploy/.env` → tarik image commit itu
→ ganti kontainer → tunggu healthy).

- Image belum ada di registry (build belum selesai atau gagal): update
  dibatalkan, versi lama tidak pernah berhenti. Ulangi sesudah workflow hijau.
- Hanya **ujung tiap push ke `master`** yang dibangun.
- Versi baru tidak healthy: versi lama dinyalakan lagi secara otomatis.
- `--rollback` kembali ke versi sebelumnya. Image lama membawa `NEXT_PUBLIC_*`
  yang berlaku saat ia dibangun, bukan isi `deploy/.env` sekarang.

Update menolak berjalan bila pohon kerja git di server tidak bersih.

### Variabel repo di GitHub (wajib sebelum image pertama)

Settings → **Secrets and variables** → **Actions** → tab **Variables**. Namanya
sama dengan di `deploy/env.example`:

| Variabel | Wajib | Contoh |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ya | `https://api.contoh.id/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | ya | `https://contoh.id` |
| `NEXT_PUBLIC_CV_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_LOCATION`, `ADMIN_PROXY_GATE` | tidak | — |

Tanpa dua yang wajib, workflow `Image` di `master` sengaja GAGAL: image dengan
alamat kosong tidak boleh terbit. Semua nilai ini publik (terbaca dari bundel
peramban) — jangan menaruh rahasia di variabel `NEXT_PUBLIC_*`.

### Satu kali, sesudah image pertama terbit

Package baru di `ghcr.io` bisa terbuat **privat** walaupun repo-nya publik, dan
server lalu gagal menariknya (`unauthorized`). Sesudah workflow `Image` pertama
selesai: profil GitHub → **Packages** → `portfolio-frontend` → **Package
settings** → **Change visibility** → **Public**. Cukup sekali.

Image publik bisa dibongkar siapa saja, lapis demi lapis, dan tidak bisa
ditarik kembali. Karena itu workflow menjalankan `tools/periksa-image.sh`
sebelum menerbitkan.

## 4. Mengubah konfigurasi

| Yang diubah di `deploy/.env` | Terapkan dengan |
|---|---|
| `API_INTERNAL_URL`, `ALAMAT_IKAT`, `PORT_WEB`, `WEB_MEM_LIMIT` | `sudo ./install.sh --non-interactive` |
| `NEXT_PUBLIC_*`, `ADMIN_PROXY_GATE` | ubah variabel repo di GitHub **dan** `deploy/.env`, jalankan ulang workflow `Image` (tombol *Run workflow*), lalu `sudo ./update.sh` |

Kunci dan artinya ada di `deploy/env.example`.

## 5. Penanganan masalah

Mulai selalu dari `sudo ./status.sh` — tiap baris yang tidak hijau membawa saran.

| Gejala | Sebab yang paling mungkin | Tindakan |
|---|---|---|
| Situs tampil tetapi daftar proyek kosong | server tidak menjangkau API, atau backend mati | **jangan restart web**; `status.sh` di repo backend; periksa `API_INTERNAL_URL` |
| Data muncul sesudah beberapa detik, tetapi tidak ada di HTML awal | sama: hanya browser yang menjangkau API | isi `API_INTERNAL_URL` |
| Perubahan `NEXT_PUBLIC_*` tidak terlihat | variabel repo di GitHub belum diubah, atau image belum dibangun ulang | ubah variabelnya, jalankan ulang workflow `Image`, `sudo ./update.sh` |
| Update berhenti: image tidak bisa ditarik | build GitHub belum selesai/gagal (mis. variabel wajib kosong), package masih privat, atau GitHub tidak terjangkau | tab **Actions** → workflow `Image`; periksa visibilitas package |
| Semua kunjungan ke `/admin` dilempar ke login | cookie backend tidak sampai ke domain ini | `docs/DEPLOYMENT.md` di repo backend; `ADMIN_PROXY_GATE` |
| `--bangun-lokal` ditolak | memori tersedia di bawah 2 GB | jangan dipaksa: tunggu image dari GitHub, atau hentikan dulu layanan lain yang berat |
| Kontainer `restarting` | image rusak | `sudo ./update.sh --rollback` |

## 6. Daftar periksa insiden

1. `sudo ./status.sh` — catat baris yang merah atau kuning.
2. Baru saja update? `sudo ./update.sh --rollback`.
3. Yang bermasalah "Backend (dari kontainer web)": periksa backend, bukan web.
4. Kontainer berhenti (`exited`): `sudo systemctl restart portfolio-frontend`
   (`start` tidak berbuat apa-apa bila unit-nya masih tercatat aktif).
5. Sesudah pulih: `sudo ./status.sh` harus kembali `normal`.

## Yang belum ada

- Pemantau berkala dengan alarm saat keadaan berubah; saat ini hanya hasil
  update yang bisa dikirim ke webhook/Telegram (`ALARM_*` di `deploy/.env`).
- Uji asap terhadap stack yang berjalan (pemeriksaan 7 di `tools/periksa.sh`).
- Jalur pemasangan Docker otomatis di `install.sh` belum pernah dijalankan:
  semua pengujian dilakukan di mesin yang sudah punya Docker.
- Pengujian dilakukan di VM Linux lokal (2026-11-25), belum di server produksi.
