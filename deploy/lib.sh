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

bangun() { # versi
  langkah "Membangun image $PROYEK/web:$1 (beberapa menit; butuh ±1,5 GB memori)"
  docker buildx version >/dev/null 2>&1 \
    || gagal "docker buildx tidak ada (Dockerfile butuh BuildKit) — pasang docker-buildx-plugin"
  dcv "$1" build web
}

# Alamat untuk memeriksa web dari server ini sendiri.
url_lokal() {
  local a; a="$(env_atau ALAMAT_IKAT 127.0.0.1)"
  case "$a" in 0.0.0.0|"") a=127.0.0.1 ;; esac
  printf 'http://%s:%s' "$a" "$(env_atau PORT_WEB 3000)"
}

# Sidik nilai yang DISISIPKAN saat build. Disimpan bersama versi supaya skrip
# bisa memberi tahu bila deploy/.env sudah berubah tetapi image belum dibangun ulang.
SIDIK_FILE="$AKAR/deploy/.sidik-build"
sidik_build() {
  local k
  for k in NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_CV_URL NEXT_PUBLIC_CONTACT_EMAIL \
           NEXT_PUBLIC_CONTACT_PHONE NEXT_PUBLIC_CONTACT_LOCATION ADMIN_PROXY_GATE; do
    printf '%s=%s\n' "$k" "$(env_get "$k")"
  done | sha256sum | cut -c1-16
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
