#!/usr/bin/env bash
# ==========================================================================
#  status.sh — "apakah situs berjalan, dan kalau tidak, salahnya di mana?"
#
#     sudo ./status.sh             untuk manusia: tiap komponen + sebab + saran
#     sudo ./status.sh --ringkas   satu baris per komponen
#     sudo ./status.sh --json      untuk mesin (pemantau, cron)
#
#  Kode keluar: 0 normal · 1 terganggu (sebagian berfungsi) · 2 mati
#               3 tidak bisa memeriksa (argumen salah, .env/Docker tidak terbaca)
#
#  Tidak mengubah apa pun. Jalankan dengan sudo: deploy/.env hanya terbaca root.
# ==========================================================================
set -uo pipefail
AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib.sh
. "$AKAR/deploy/lib.sh"

# "Tidak bisa memeriksa" bukan "terganggu": pemantau harus bisa membedakannya.
gagal() { merah "GAGAL: $*" >&2; exit 3; }

MODE=penuh
for a in "$@"; do
  case "$a" in
    --ringkas) MODE=ringkas ;;
    --json) MODE=json ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,2\}//'; exit 0 ;;
    *) gagal "argumen tidak dikenal: $a (lihat --help)" ;;
  esac
done

butuh_env
[[ -r "$ENV_FILE" ]] || gagal "$ENV_FILE tidak terbaca — jalankan: sudo $0 $*"
butuh_perintah docker curl
# Compose yang tidak bisa membaca konfigurasinya membuat semua kontainer tampak
# "absen" — itu kegagalan memeriksa, bukan layanan yang mati.
dc config -q 2>/dev/null || gagal "docker compose tidak bisa membaca konfigurasi — lihat: docker compose -f $COMPOSE_UTAMA --env-file $ENV_FILE config -q"

# Seperti keadaan_kontainer, tetapi kontainer yang TIDAK berjalan dilaporkan
# dengan statusnya (exited, restarting, …): Docker tetap menyimpan hasil
# healthcheck terakhir, sehingga kontainer yang dihentikan tampak "unhealthy"
# dan sarannya jadi salah arah.
keadaan() {
  local id; id="$(dc ps -a -q "$1" 2>/dev/null | head -n1 || true)"
  [[ -n "$id" ]] || { echo absen; return; }
  docker inspect -f '{{if ne .State.Status "running"}}{{.State.Status}}{{else if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}' "$id" 2>/dev/null || echo absen
}
# Versi yang BENAR-BENAR berjalan (tag image kontainer), bukan yang tercatat.
versi_jalan() {
  local id; id="$(dc ps -q "$1" 2>/dev/null | head -n1 || true)"
  [[ -n "$id" ]] || return 0
  docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null | sed 's/^.*://'
}

# Tiap butir: id|nama|keadaan(ok/terganggu/mati)|kritis(1/0)|pesan|saran
BUTIR=()
# "|" adalah pemisah kolom dan karakter kendali merusak JSON: keduanya dibuang
# dari pesan (bisa berasal dari nilai deploy/.env).
bersih() { printf '%s' "$1" | tr '|' '/' | tr -d '\000-\037'; }
catat() { BUTIR+=("$1|$2|$3|$4|$(bersih "$5")|$(bersih "${6:-}")"); }

# ---- kontainer web
st="$(keadaan web)"
case "$st" in
  healthy) catat web_kontainer "Kontainer web" ok 1 "healthy, versi $(versi_jalan web)" ;;
  starting) catat web_kontainer "Kontainer web" terganggu 1 "baru menyala, belum healthy" "tunggu ±30 detik lalu periksa lagi" ;;
  absen|exited) catat web_kontainer "Kontainer web" mati 1 "$st" "sudo systemctl restart $PROYEK   (belum pernah dipasang: sudo ./install.sh)" ;;
  restarting) catat web_kontainer "Kontainer web" mati 1 "terus mati lalu menyala lagi" "lihat sebabnya: docker logs --tail 50 ${PROYEK}-web-1" ;;
  *) catat web_kontainer "Kontainer web" mati 1 "$st" "lihat sebabnya: docker logs --tail 50 ${PROYEK}-web-1" ;;
esac

# ---- versi yang berjalan vs yang tercatat. Berbeda = update terputus di
#      tengah: boot berikutnya akan menyalakan versi yang TERCATAT.
jalan="$(versi_jalan web)"; catat_v="$(versi_aktif web)"
if [[ -n "$jalan" && -n "$catat_v" && "$jalan" != "$catat_v" ]]; then
  catat versi "Versi" terganggu 0 "berjalan $jalan, tercatat $catat_v" "samakan dengan menjalankan: sudo ./update.sh --no-pull   (atau --rollback)"
fi

# ---- situs menjawab (dari server ini, lewat port yang dipublikasikan)
URL="$(url_lokal)"
kode="$(curl -s -o /dev/null -m 8 -w '%{http_code}' "$URL/" 2>/dev/null)" || kode=000
if [[ "$kode" == 200 ]]; then
  catat web_hidup "Situs menjawab" ok 1 "$URL/ → 200"
else
  catat web_hidup "Situs menjawab" mati 1 "$URL/ → $kode" "periksa ALAMAT_IKAT/PORT_WEB di deploy/.env dan log kontainer web"
fi

# ---- backend, dilihat DARI DALAM kontainer web (alamat yang dipakai server
#      Next.js untuk mengisi halaman). Backend mati bukan salah frontend:
#      situs tetap tampil tanpa data, dan me-restart web tidak menolong.
if [[ "$st" == healthy ]]; then
  api="$(env_get API_INTERNAL_URL)"; [[ -n "$api" ]] || api="$(env_get NEXT_PUBLIC_API_URL)"
  case "$api" in
    http://*|https://*)
      hasil="$(dc exec -T -e ALAMAT_UJI="${api%/}/healthz" web node -e \
        "fetch(process.env.ALAMAT_UJI,{signal:AbortSignal.timeout(5000)}).then(r=>console.log(r.status)).catch(e=>console.log('gagal: '+(e.cause&&e.cause.code||e.name)))" 2>/dev/null)" || hasil="gagal"
      if [[ "$hasil" == 200 ]]; then
        catat api_dari_web "Backend (dari kontainer web)" ok 0 "${api%/}/healthz → 200"
      else
        catat api_dari_web "Backend (dari kontainer web)" terganggu 0 "${api%/}/healthz → $hasil" \
          "halaman tampil TANPA data proyek; periksa backend (di repo backend: sudo ./status.sh) atau API_INTERNAL_URL — restart web tidak menolong"
      fi ;;
    *) catat api_dari_web "Backend (dari kontainer web)" terganggu 0 "alamat API bukan URL penuh ($api)" \
         "isi API_INTERNAL_URL di deploy/.env supaya server bisa mengambil data" ;;
  esac
fi

# ---- deploy/.env sudah berubah tetapi image belum dibangun ulang?
if [[ -r "$SIDIK_FILE" ]] && [[ "$(cat "$SIDIK_FILE")" != "$(sidik_build)" ]]; then
  catat build_basi "Konfigurasi build" terganggu 0 "NEXT_PUBLIC_*/ADMIN_PROXY_GATE di deploy/.env berbeda dari image yang berjalan" \
    "bangun ulang: sudo ./update.sh --no-pull"
fi

# ---- disk
# Yang diukur: sistem berkas terpenuh di antara folder repo dan tempat Docker
# menyimpan image, volume, dan log.
pakai="$(df -P "$AKAR" "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)" 2>/dev/null \
  | awk 'NR>1{gsub("%","",$5); if ($5+0 > m) m=$5+0} END{if (NR>1) print m}')"
if [[ -n "$pakai" ]]; then
  if (( pakai >= 90 )); then
    catat disk "Disk" terganggu 0 "terpakai ${pakai}%" "docker builder prune -f; periksa: docker system df"
  else
    catat disk "Disk" ok 0 "terpakai ${pakai}%"
  fi
fi

# ---- keadaan keseluruhan: komponen kritis mati = mati; selain itu yang tidak ok = terganggu
KELUAR=0
for b in "${BUTIR[@]}"; do
  IFS='|' read -r _ _ k kritis _ _ <<<"$b"
  [[ "$k" == ok ]] && continue
  if [[ "$k" == mati && "$kritis" == 1 ]]; then KELUAR=2; elif (( KELUAR < 1 )); then KELUAR=1; fi
done
case $KELUAR in 0) SEMUA=normal ;; 1) SEMUA=terganggu ;; *) SEMUA=mati ;; esac

json_teks() { local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "$s"; }

case "$MODE" in
  json)
    printf '{"proyek":%s,"keadaan":%s,"waktu":%s,"komponen":[' "$(json_teks "$PROYEK")" "$(json_teks "$SEMUA")" "$(json_teks "$(date -Is)")"
    pisah=""
    for b in "${BUTIR[@]}"; do
      IFS='|' read -r id nama k kritis pesan saran <<<"$b"
      printf '%s{"id":%s,"nama":%s,"keadaan":%s,"kritis":%s,"pesan":%s,"saran":%s}' "$pisah" \
        "$(json_teks "$id")" "$(json_teks "$nama")" "$(json_teks "$k")" \
        "$([[ $kritis == 1 ]] && echo true || echo false)" "$(json_teks "$pesan")" "$(json_teks "$saran")"
      pisah=","
    done
    printf ']}\n'
    ;;
  ringkas)
    for b in "${BUTIR[@]}"; do
      IFS='|' read -r _ nama k _ pesan _ <<<"$b"
      printf '%-10s %s: %s\n' "$k" "$nama" "$pesan"
    done
    printf '%s: %s\n' "$PROYEK" "$SEMUA"
    ;;
  *)
    printf '%s — %s\n\n' "$PROYEK" "$(date '+%Y-%m-%d %H:%M:%S')"
    for b in "${BUTIR[@]}"; do
      IFS='|' read -r _ nama k _ pesan saran <<<"$b"
      case "$k" in ok) hijau "  ✓ $nama: $pesan" ;; terganggu) kuning "  ! $nama: $pesan" ;; *) merah "  ✗ $nama: $pesan" ;; esac
      [[ -z "$saran" ]] || printf '      → %s\n' "$saran"
    done
    printf '\n'
    case $KELUAR in 0) hijau "Keadaan: normal" ;; 1) kuning "Keadaan: terganggu" ;; *) merah "Keadaan: mati" ;; esac
    ;;
esac
exit $KELUAR
