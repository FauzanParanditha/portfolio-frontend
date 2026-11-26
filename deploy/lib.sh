# shellcheck shell=bash
# ==========================================================================
#  deploy/lib.sh — bagian khusus portfolio-frontend di atas lib-dasar.sh.
#  Disertakan install.sh, update.sh, dan status.sh:
#     AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#     . "$AKAR/deploy/lib.sh"
#
#  lib-dasar.sh adalah salinan APA ADANYA dari skill project-standard
#  (scripts/lib-dasar.sh). Jangan disunting di sini: perbaikan dilakukan di
#  sumbernya lalu disalin ulang, supaya `diff` langsung menunjukkan pergeseran.
# ==========================================================================

: "${AKAR:?AKAR harus di-set sebelum menyertakan deploy/lib.sh}"
# Path repo ikut tertulis di unit systemd, yang tidak mengenal kutip: spasi, %,
# $, atau kutip di sana menghasilkan berkas rusak.
[[ "$AKAR" =~ ^/[A-Za-z0-9_./-]+$ ]] || {
  echo "GAGAL: path repo \"$AKAR\" memuat karakter selain huruf, angka, _ . / - — pindahkan ke path sederhana (mis. /opt/portfolio-frontend)" >&2
  exit 3
}
PROYEK="portfolio-frontend"
ENV_FILE="$AKAR/deploy/.env"
ENV_CONTOH="$AKAR/deploy/env.example"
COMPOSE_UTAMA="$AKAR/deploy/docker-compose.yml"
VERSI_FILE="$AKAR/deploy/.versi"
CABANG_FILE="$AKAR/deploy/.cabang"
# shellcheck source=deploy/lib-dasar.sh
. "$AKAR/deploy/lib-dasar.sh"

# Layanan aplikasi (yang punya image bertanda versi dan ikut di-update).
LAYANAN="web"

# Skrip ini menulis ke deploy/.env sebagai root. Bila berkas itu symlink
# (folder repo biasanya milik pengguna biasa), tulisan root mengenai targetnya.
[[ ! -L "$ENV_FILE" ]] || gagal "$ENV_FILE adalah symlink — hapus, lalu jalankan: sudo ./install.sh"

butuh_env() { [[ -f "$ENV_FILE" ]] || gagal "$ENV_FILE belum ada — jalankan dulu: sudo ./install.sh"; }

# Satu operasi pada satu waktu (install, update). Kunci di /run (milik root),
# bukan /var/lock yang bisa ditulisi semua pengguna.
kunci_operasi() {
  install -d -m 700 "/run/$PROYEK"
  kunci "/run/$PROYEK/operasi.lock" || gagal "operasi lain (install/update) sedang berjalan"
}

# compose dengan versi image tertentu (build dan pergantian versi). Di luar itu
# pakai dc_aktif, yang membaca versi aktif dari berkas override.
dcv() { local v="$1"; shift; VERSI="$v" dc "$@"; }

# Build Next.js memakai 1–2 GB memori. Di server kecil yang juga menjalankan
# layanan lain, itu menghabiskan RAM, server mulai swap, dan semuanya macet —
# termasuk situs yang sedang berjalan. Karena itu build lokal DITOLAK bila
# memori yang tersedia (tanpa menghitung swap) di bawah batas ini.
BATAS_MEMORI_BUILD_MB=2000
bangun() { # versi
  local sedia
  sedia="$(awk '/MemAvailable/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
  if (( sedia < BATAS_MEMORI_BUILD_MB )); then
    merah "Build lokal ditolak: memori tersedia ${sedia} MB, butuh minimal ${BATAS_MEMORI_BUILD_MB} MB." >&2
    merah "Build Next.js memakai 1–2 GB; di bawah batas itu server akan swap dan macet." >&2
    merah "Pilihan: (1) biarkan versi sekarang berjalan dan tunggu image dari GitHub;" >&2
    merah "         (2) hentikan dulu layanan lain yang berat di server ini, lalu ulangi." >&2
    return 1
  fi
  langkah "Membangun image $PROYEK/web:$1 di server ini (memori tersedia ${sedia} MB)"
  docker buildx version >/dev/null 2>&1 \
    || gagal "docker buildx tidak ada (Dockerfile butuh BuildKit) — pasang docker-buildx-plugin"
  dcv "$1" build web
}

# ------------------------------------------------------------------ image dari GitHub
# Image dibangun GitHub Actions (.github/workflows/image.yml) tiap ada commit di
# master dan diterbitkan ke registry bertanda SHA commit. Server cukup
# menariknya — tidak perlu membangun sendiri. NEXT_PUBLIC_* yang disisipkan
# berasal dari VARIABEL REPO di GitHub, bukan dari deploy/.env server.
IMAGE_JAUH_BAWAAN="ghcr.io/fauzanparanditha/portfolio-frontend"
image_jauh() { env_atau IMAGE_JAUH "$IMAGE_JAUH_BAWAAN"; }
# github (bawaan) | lokal. `--bangun-lokal` pada install.sh/update.sh memaksa
# lokal untuk satu kali jalan.
sumber_image() {
  local s; s="$(env_atau SUMBER_IMAGE github)"
  [[ "${PAKSA_LOKAL:-0}" == 1 ]] && s=lokal
  case "$s" in github|lokal) printf '%s' "$s" ;; *) gagal "SUMBER_IMAGE harus \"github\" atau \"lokal\" (sekarang: $s)" ;; esac
}

# tarik <versi>: ambil image untuk commit yang ter-checkout, lalu beri nama lokal
# $PROYEK/web:<versi>. Sesudah itu ia diperlakukan persis seperti image hasil
# build lokal (ganti versi, rollback, pemangkasan).
tarik() {
  local v="$1" sha jauh rev galat
  sha="$(git_repo rev-parse HEAD 2>/dev/null)" || gagal "tidak bisa membaca commit yang ter-checkout"
  jauh="$(image_jauh):$sha"
  langkah "Menarik image $jauh"
  if ! galat="$(docker pull -q "$jauh" 2>&1 >/dev/null)"; then
    printf '%s\n' "$galat" | tail -n 3 >&2
    merah "Image untuk commit ${sha:0:12} tidak bisa ditarik. Kemungkinan sebabnya:" >&2
    merah "  · build di GitHub belum selesai atau gagal — lihat tab Actions (workflow \"Image\"), lalu ulangi;" >&2
    merah "  · commit ini tidak pernah dibangun (hanya ujung tiap push ke master yang dibangun);" >&2
    merah "  · galat \"unauthorized\"/\"denied\": package di ghcr.io masih privat — ubah menjadi Public;" >&2
    merah "  · GitHub tidak terjangkau dari server ini." >&2
    merah "Versi yang sedang berjalan tidak tersentuh — biarkan ia berjalan sampai image tersedia." >&2
    return 1
  fi
  # Tag bisa ditulis ulang; label revisi ditanam saat build. Keduanya harus
  # menunjuk commit yang sama dengan kode di folder ini.
  rev="$(docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$jauh" 2>/dev/null || true)"
  if [[ "$rev" != "$sha" ]]; then
    docker image rm "$jauh" >/dev/null 2>&1 || true
    merah "Image $jauh berlabel revisi \"$rev\", bukan commit $sha — ditolak." >&2
    return 1
  fi
  docker tag "$jauh" "$PROYEK/web:$v"
  # Hanya melepas nama jauhnya; isi image tetap ada lewat nama lokal.
  docker image rm "$jauh" >/dev/null 2>&1 || true
  hijau "image siap: $PROYEK/web:$v"
}

# siapkan_image <versi>: tarik dari registry, atau bangun di sini.
siapkan_image() {
  local s; s="$(sumber_image)" || return 1
  if [[ "$s" == lokal ]]; then bangun "$1"; else tarik "$1"; fi
}

# Alamat untuk memeriksa web dari server ini sendiri.
url_lokal() {
  local a; a="$(env_atau ALAMAT_IKAT 127.0.0.1)"
  case "$a" in 0.0.0.0|"") a=127.0.0.1 ;; esac
  printf 'http://%s:%s' "$a" "$(env_atau PORT_WEB 3000)"
}

# Nilai yang DISISIPKAN saat build tercatat di dalam image (/app/BUILD_ENV).
# beda_build membandingkannya dengan deploy/.env dan mencetak nama kunci yang
# berbeda — deploy/.env menjadi "nilai yang diharapkan server ini", dari mana
# pun image-nya dibangun. Kosong = sama, atau image lama tanpa catatan itu.
KUNCI_BUILD="NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_CV_URL NEXT_PUBLIC_CONTACT_EMAIL NEXT_PUBLIC_CONTACT_PHONE NEXT_PUBLIC_CONTACT_LOCATION ADMIN_PROXY_GATE"
beda_build() {
  local isi k mau ada beda=""
  isi="$(dc exec -T web cat /app/BUILD_ENV 2>/dev/null || true)"
  [[ -n "$isi" ]] || return 0
  for k in $KUNCI_BUILD; do
    mau="$(env_get "$k")"; [[ "$mau" == \<*\> ]] && mau=""
    ada="$(printf '%s\n' "$isi" | sed -n "s/^$k=//p" | sed -n 1p)"
    [[ "$mau" == "$ada" ]] || beda+="$k "
  done
  printf '%s' "${beda% }"
}

# Cabang yang diikuti server ini. Dicatat tiap kali kode ditarik dari sebuah
# cabang, supaya `update.sh` sesudah `--ref=<tag>` (HEAD lepas) kembali ke
# cabang yang sama — bukan ke cabang bawaan origin.
catat_cabang() {
  local c; c="$(git_repo symbolic-ref -q --short HEAD 2>/dev/null || true)"
  [[ -z "$c" ]] || printf '%s\n' "$c" >"$CABANG_FILE"
}
cabang_ikut() {
  local c=""
  [[ ! -r "$CABANG_FILE" ]] || c="$(sed -n 1p "$CABANG_FILE")"
  [[ -n "$c" ]] || c="$(git_repo symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)"
  printf '%s' "${c:-master}"
}

# Pemilik folder repo bukan root: akun itu SETARA ROOT, karena unit systemd
# menjalankan skrip dari folder ini sebagai root.
peringatkan_pemilik_repo() {
  local p; p="$(stat -c %U "$AKAR" 2>/dev/null || echo root)"
  [[ "$p" == root ]] || kuning "Folder repo milik \"$p\": akun itu setara root di server ini (systemd menjalankan skrip dari sini sebagai root). Lebih aman: clone sebagai root di /opt/$PROYEK."
}

# Compose >= 2.20 (versi yang sama dituntut stack backend).
butuh_compose() {
  local v; v="$(docker compose version --short 2>/dev/null || true)"; v="${v#v}"
  [[ -n "$v" ]] || gagal "plugin docker compose tidak ada — pasang docker-compose-plugin"
  [[ "$(printf '%s\n' 2.20 "$v" | sort -V | head -n1)" == 2.20 ]] \
    || gagal "docker compose $v terlalu lama (butuh >= 2.20) — perbarui docker-compose-plugin"
}
