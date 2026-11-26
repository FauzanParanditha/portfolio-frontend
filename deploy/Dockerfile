# syntax=docker/dockerfile:1.7
# Image produksi frontend. Konteks build = akar repo:
#   docker compose -f deploy/docker-compose.yml build web
# Butuh BuildKit (docker-buildx-plugin) karena memakai RUN --mount=type=cache.

# Satu tempat untuk menaikkan versi; jangan pakai `latest`.
ARG NODE_IMAGE=node:22.23.4-alpine3.24

# ---------------------------------------------------------------- dependensi
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# pnpm lewat corepack: versinya dibaca dari "packageManager" di package.json,
# jadi sama dengan laptop dan CI.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# Manifest dulu: lapisan dependensi tidak diulang saat hanya kode yang berubah.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile

# ---------------------------------------------------------------- build
FROM deps AS build
COPY . .
# Semua NEXT_PUBLIC_* DISISIPKAN ke bundel saat build, jadi bukan rahasia dan
# mengubahnya berarti membangun ulang image (sudo ./update.sh --no-pull).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CV_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_CONTACT_PHONE
ARG NEXT_PUBLIC_CONTACT_LOCATION
ARG ADMIN_PROXY_GATE
# Hanya dipakai server Next.js saat prerender (bukan NEXT_PUBLIC, tidak masuk
# bundel, tidak terbawa ke tahap runtime): tanpa ini, bila alamat publik API
# tidak terjangkau dari mesin build, halaman terbit kosong sampai revalidasi.
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_CV_URL=${NEXT_PUBLIC_CV_URL} \
    NEXT_PUBLIC_CONTACT_EMAIL=${NEXT_PUBLIC_CONTACT_EMAIL} \
    NEXT_PUBLIC_CONTACT_PHONE=${NEXT_PUBLIC_CONTACT_PHONE} \
    NEXT_PUBLIC_CONTACT_LOCATION=${NEXT_PUBLIC_CONTACT_LOCATION} \
    ADMIN_PROXY_GATE=${ADMIN_PROXY_GATE} \
    API_INTERNAL_URL=${API_INTERNAL_URL} \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache pnpm build
# Nilai yang DISISIPKAN ke bundel, dicatat di dalam image supaya status.sh
# bisa membandingkannya dengan deploy/.env di server. Semuanya memang publik
# (terbaca dari bundel peramban).
RUN env | grep -E '^(NEXT_PUBLIC_[A-Z0-9_]+|ADMIN_PROXY_GATE)=' | sort > /app/BUILD_ENV

# ---------------------------------------------------------------- runtime
FROM ${NODE_IMAGE} AS runtime
# tini sebagai PID 1: meneruskan sinyal, sehingga `docker stop` tidak menunggu
# sampai batas waktu lalu membunuh proses di tengah request.
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Keluaran standalone: server.js + node_modules yang benar-benar dipakai.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/BUILD_ENV ./BUILD_ENV

ARG VERSI=dev
LABEL org.opencontainers.image.title="portfolio-frontend" \
      org.opencontainers.image.version="${VERSI}"
# Berkas aplikasi milik root dan hanya-baca (aplikasi tidak bisa mengubah
# kodenya sendiri) tetapi terbaca semua: clone di server ber-umask ketat
# menghasilkan berkas 600 yang tidak terbaca pengguna `node`.
RUN printf '%s\n' "$VERSI" > /app/VERSI \
 && chmod -R a+rX,a-w /app \
 && mkdir -p /app/.next/cache \
 && chown node:node /app/.next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/robots.txt').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
