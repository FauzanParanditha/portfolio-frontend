import { ImageResponse } from "next/og";

// Metadata rute gambar — Next memakainya untuk og:image & twitter:image.
// Tanpa `runtime = "edge"` agar gambar di-prerender statis saat build.
export const alt = "Paranditha — Fullstack Programmer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG image dinamis bergaya editorial hitam-putih.
 * Tanpa aset/font eksternal — memakai font bawaan ImageResponse agar build stabil.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "80px",
        }}
      >
        {/* Baris atas: label kecil + garis aksen */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#a3a3a3",
          }}
        >
          <span>Portfolio</span>
          <span>2026</span>
        </div>

        {/* Blok judul utama */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 120,
              height: 6,
              background: "#fafafa",
              marginBottom: 40,
            }}
          />
          <div
            style={{
              fontSize: 150,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            PARANDITHA
          </div>
          <div
            style={{
              fontSize: 44,
              marginTop: 24,
              letterSpacing: 4,
              color: "#d4d4d4",
            }}
          >
            Fullstack Programmer
          </div>
        </div>

        {/* Baris bawah: garis + tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #262626",
            paddingTop: 32,
            fontSize: 26,
            color: "#a3a3a3",
          }}
        >
          <span>Fauzan Paranditha</span>
          <span>Clean architecture · Performa · Dampak nyata</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
