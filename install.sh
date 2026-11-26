#!/usr/bin/env bash
# ==========================================================================
#  install.sh — memasang frontend di server ini (Ubuntu/Debian + Docker).
#
#     sudo ./install.sh                    bertanya untuk nilai yang belum diisi
#     sudo ./install.sh --non-interactive  memakai deploy/.env yang sudah diisi
#     sudo ./install.sh --bangun-lokal     bangun image di server ini (ditolak bila
#                                          memori tersedia di bawah 2 GB)
#
#  Aman diulang: tiap langkah melewati dirinya bila sudah selesai, jadi
#  menjalankannya lagi adalah cara menerapkan perubahan konfigurasi RUNTIME.
#  Menjalankan ulang TIDAK membangun ulang atau mengganti versi yang berjalan —
#  itu tugas ./update.sh (yang punya jalan mundur), termasuk setelah mengubah
#  NEXT_PUBLIC_* yang disisipkan saat build.
#
#  Yang dikerjakan: prasyarat → deploy/.env → jaringan Docker → image → web →
#  menyala saat boot → ./status.sh
# ==========================================================================
set -Eeuo pipefail
AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib.sh
. "$AKAR/deploy/lib.sh"

INTERAKTIF=1; PAKSA_LOKAL=0
for a in "$@"; do
  case "$a" in
    --non-interactive) INTERAKTIF=0 ;;
    --bangun-lokal) PAKSA_LOKAL=1 ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,2\}//'; exit 0 ;;
    *) gagal "argumen tidak dikenal: $a (lihat --help)" ;;
  esac
done
[[ -t 0 ]] || INTERAKTIF=0

butuh_root
kunci_operasi
trap 'merah "install.sh berhenti di baris $LINENO. Perbaiki sebabnya lalu jalankan lagi — aman diulang."' ERR

# tanya KUNCI "pertanyaan": nilai tersimpan menjadi bawaan (Enter = pakai itu);
# "-" mengosongkan; placeholder <...> dianggap belum diisi.
tanya() {
  local k="$1" t="$2" lama jawab
  lama="$(env_get "$k")"; [[ "$lama" == \<*\> ]] && lama=""
  if (( INTERAKTIF )); then
    read -r -p "$t${lama:+ [$lama]}: " jawab || true
    if [[ "$jawab" == "-" ]]; then env_set "$k" ""
    else
      jawab="${jawab:-$lama}"
      [[ -z "$jawab" ]] || env_set "$k" "$jawab"
    fi
  fi
}

# ---------------------------------------------------------------- 1. prasyarat
langkah "1/6 Prasyarat"
peringatkan_pemilik_repo
ram="$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
tukar="$(awk '/SwapTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
bebas="$(df -Pm "$AKAR" | awk 'NR==2{print $4}')"
echo "RAM ${ram} MB · swap ${tukar} MB · disk bebas ${bebas} MB"
(( bebas >= 4000 )) || kuning "Disk bebas di bawah 4 GB: image dan cache build butuh ruang."

if ! command -v docker >/dev/null; then
  command -v apt-get >/dev/null || gagal "Docker belum terpasang dan ini bukan sistem apt — pasang Docker Engine + compose + buildx secara manual"
  langkah "Memasang Docker dari repo resmi Docker"
  # shellcheck disable=SC1091
  . /etc/os-release
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  # Pengaturan daemon HANYA untuk Docker yang baru saja dipasang skrip ini.
  # Docker yang sudah ada mungkin melayani layanan lain: no-new-privileges dan
  # restart daemon tidak boleh dipaksakan kepada mereka.
  if [[ ! -e /etc/docker/daemon.json ]]; then
    mkdir -p /etc/docker
    printf '%s\n' '{' '  "log-driver": "json-file",' '  "log-opts": { "max-size": "20m", "max-file": "5" },' \
      '  "live-restore": true,' '  "no-new-privileges": true' '}' >/etc/docker/daemon.json
    systemctl restart docker
  fi
fi
butuh_perintah docker git curl flock sha256sum
butuh_compose
hijau "Docker $(docker version --format '{{.Server.Version}}'), compose $(docker compose version --short)"

# ---------------------------------------------------------------- 2. .env
langkah "2/6 Konfigurasi (deploy/.env)"
if [[ ! -f "$ENV_FILE" ]]; then
  install -m 600 -o root -g root "$ENV_CONTOH" "$ENV_FILE"
  hijau "dibuat dari deploy/env.example (milik root, izin 600)"
else
  # Berkas yang disiapkan pengguna biasa sebelum pemasangan: jadikan milik root.
  chown root:root "$ENV_FILE"; chmod 600 "$ENV_FILE"
  env_lengkapi_dari "$ENV_CONTOH"
fi
env_rapikan_ganda
env_periksa_ganda

tanya NEXT_PUBLIC_SITE_URL "Alamat publik situs (mis. https://contoh.id)"
tanya NEXT_PUBLIC_API_URL  "Alamat API dari sisi browser, termasuk /api/v1 (mis. https://api.contoh.id/api/v1)"
tanya API_INTERNAL_URL     "Alamat API dari dalam kontainer, termasuk /api/v1 (kosong = sama dengan di atas; - untuk mengosongkan)"
tanya NEXT_PUBLIC_CONTACT_EMAIL "Email kontak yang tampil di situs"
tanya ALAMAT_IKAT          "Alamat ikat port web (127.0.0.1 = hanya server ini, 0.0.0.0 = terbuka)"
tanya PORT_WEB             "Port web di server ini"
for k in NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL; do wajib "$k"; done

case "$(env_get NEXT_PUBLIC_API_URL)" in
  http://*|https://*) ;;
  *) [[ -n "$(env_get API_INTERNAL_URL)" ]] \
       || kuning "NEXT_PUBLIC_API_URL berupa path relatif dan API_INTERNAL_URL kosong: server tidak bisa mengambil data, halaman terbit tanpa isi proyek." ;;
esac
[[ "$(env_atau ALAMAT_IKAT 127.0.0.1)" != 0.0.0.0 ]] \
  || kuning "ALAMAT_IKAT=0.0.0.0: port web terbuka ke internet dan MELEWATI UFW."

# ---------------------------------------------------------------- 3. jaringan
langkah "3/6 Jaringan Docker"
atur_jaringan
echo "subnet $(env_get DOCKER_SUBNET)"

# ---------------------------------------------------------------- 4. image
langkah "4/6 Image"
catat_cabang
VERSI_PAKAI="$(versi_aktif web)"
if [[ -n "$VERSI_PAKAI" ]] && docker image inspect "$PROYEK/web:$VERSI_PAKAI" >/dev/null 2>&1; then
  echo "versi $VERSI_PAKAI sudah terpasang — tidak dibangun ulang (pakai ./update.sh untuk versi baru)"
  SUDAH_ADA=1
else
  VERSI_PAKAI="$(versi_baru)"
  siapkan_image "$VERSI_PAKAI" || gagal "image tidak tersedia — lihat pesan di atas"
  SUDAH_ADA=0
fi

# ---------------------------------------------------------------- 5. web
langkah "5/6 Web"
# Selalu diperiksa (kontainer proyek ini sendiri dikecualikan): alamat/port yang
# salah harus ketahuan SEBELUM compose membuang kontainer yang sedang berjalan.
# Konfigurasi runtime yang berubah membuat compose mengganti kontainernya.
periksa_port "$(env_atau ALAMAT_IKAT 127.0.0.1)" "$(env_atau PORT_WEB 3000)" PORT_WEB || gagal "port web tidak bisa dipakai"
dcv "$VERSI_PAKAI" up -d web
tunggu_sehat web 90 || { dc logs --tail 40 web || true; gagal "web tidak healthy — lihat log di atas"; }
if (( ! SUDAH_ADA )); then catat_versi web "$VERSI_PAKAI" ""; fi
tulis_override $LAYANAN
hijau "web healthy, versi $(versi_aktif web)"

# ---------------------------------------------------------------- 6. boot
langkah "6/6 Menyala saat boot"
pasang_systemd
# Unit baru hanya "enabled": tanpa di-start, systemd menganggapnya belum aktif
# dan `systemctl stop` tidak menghentikan apa pun. Start di sini tidak membuat
# ulang kontainer yang sudah berjalan.
if [[ -d /run/systemd/system ]]; then systemctl start "$PROYEK.service"; fi

trap - ERR
langkah "Selesai — keadaan sekarang"
"$AKAR/status.sh" || true
