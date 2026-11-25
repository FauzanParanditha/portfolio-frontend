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
| Pasang versi terbaru | `sudo ./update.sh` |
| Bangun ulang setelah mengubah `NEXT_PUBLIC_*` | `sudo ./update.sh --no-pull` |
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

- **`NEXT_PUBLIC_*` disisipkan saat build.** Mengubahnya di `deploy/.env` tidak
  berpengaruh sampai image dibangun ulang (`sudo ./update.sh --no-pull`).
  `status.sh` melaporkan "Konfigurasi build" bila keduanya berbeda.
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
- **Build butuh ±1,5 GB memori** di atas yang sedang berjalan. Di server ber-RAM
  kecil, pastikan ada swap; `install.sh` memperingatkan bila RAM + swap di
  bawah 3,5 GB.
- Saat berganti versi, situs tidak terjangkau beberapa detik.

## 2. Log

`docker logs portfolio-frontend-web-1` — 5 berkas × 20 MB. Baris
`[portfolio] gagal mengambil …` berarti server tidak bisa menjangkau API.

## 3. Pembaruan dan jalan mundur

`sudo ./update.sh`: tarik kode → lengkapi `deploy/.env` dengan kunci baru →
bangun image versi baru → ganti kontainer → tunggu healthy.

- Build gagal: update dibatalkan, versi lama tidak pernah berhenti.
- Versi baru tidak healthy: versi lama dinyalakan lagi secara otomatis.
- `--rollback` kembali ke versi sebelumnya. Image lama membawa `NEXT_PUBLIC_*`
  yang berlaku saat ia dibangun, bukan isi `deploy/.env` sekarang.

Update menolak berjalan bila pohon kerja git di server tidak bersih.

## 4. Mengubah konfigurasi

| Yang diubah di `deploy/.env` | Terapkan dengan |
|---|---|
| `API_INTERNAL_URL`, `ALAMAT_IKAT`, `PORT_WEB`, `WEB_MEM_LIMIT` | `sudo ./install.sh --non-interactive` |
| `NEXT_PUBLIC_*`, `ADMIN_PROXY_GATE` | `sudo ./update.sh --no-pull` |

Kunci dan artinya ada di `deploy/env.example`.

## 5. Penanganan masalah

Mulai selalu dari `sudo ./status.sh` — tiap baris yang tidak hijau membawa saran.

| Gejala | Sebab yang paling mungkin | Tindakan |
|---|---|---|
| Situs tampil tetapi daftar proyek kosong | server tidak menjangkau API, atau backend mati | **jangan restart web**; `status.sh` di repo backend; periksa `API_INTERNAL_URL` |
| Data muncul sesudah beberapa detik, tetapi tidak ada di HTML awal | sama: hanya browser yang menjangkau API | isi `API_INTERNAL_URL` |
| Perubahan `NEXT_PUBLIC_*` tidak terlihat | image belum dibangun ulang | `sudo ./update.sh --no-pull` |
| Semua kunjungan ke `/admin` dilempar ke login | cookie backend tidak sampai ke domain ini | `docs/DEPLOYMENT.md` di repo backend; `ADMIN_PROXY_GATE` |
| Build berhenti dengan `Killed` | kehabisan memori | tambah swap, ulangi `update.sh` |
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
