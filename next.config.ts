import type { NextConfig } from "next";

// Security headers (hardening) yang diterapkan ke semua route.
// Catatan: sengaja TIDAK memasang CSP script-src ketat agar tidak memecah
// runtime Next.js/Turbopack (inline/eval script internal).
const securityHeaders = [
  // Anti-clickjacking — penting untuk /admin
  { key: "X-Frame-Options", value: "DENY" },
  // Cegah MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Batasi kebocoran referrer lintas origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan fitur browser sensitif yang tidak dipakai
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
