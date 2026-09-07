import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";
import Providers from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

// Deskripsi ringkas dipakai ulang di beberapa channel (meta, OG, Twitter).
const siteDescription =
  "Portofolio Fauzan Paranditha — fullstack programmer yang membangun aplikasi web andal dengan arsitektur bersih, performa kuat, dan dampak nyata.";

const INTRO_SESSION_SCRIPT = `
try {
  if (sessionStorage.getItem('introSeen')) {
    document.documentElement.setAttribute('data-intro', 'seen');
  } else {
    sessionStorage.setItem('introSeen', '1');
  }
} catch (e) {
  /* mode privat / storage diblokir — intro tampil seperti biasa */
}
`.trim();

export const metadata: Metadata = {
  // metadataBase membuat semua URL relatif (canonical, OG image) menjadi absolut.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Paranditha — Fullstack Programmer",
    template: "%s — Paranditha",
  },
  description: siteDescription,
  keywords: [
    "Fauzan Paranditha",
    "Paranditha",
    "Fullstack Programmer",
    "Fullstack Developer",
    "Web Developer",
    "Go",
    "Golang",
    "Next.js",
    "React",
    "TypeScript",
    "Portofolio",
    "Portfolio",
  ],
  authors: [{ name: "Fauzan Paranditha", url: siteUrl }],
  creator: "Fauzan Paranditha",
  publisher: "Fauzan Paranditha",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Paranditha",
    locale: "id_ID",
    url: siteUrl,
    title: "Paranditha — Fullstack Programmer",
    description: siteDescription,
    // Next otomatis mengambil src/app/opengraph-image.tsx; daftar eksplisit di
    // sini menjadikannya default OG image bila halaman anak tidak menyetel sendiri.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Paranditha — Fullstack Programmer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paranditha — Fullstack Programmer",
    description: siteDescription,
    creator: "@paranditha",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning HANYA untuk atribut <html> itu sendiri, bukan
    // isinya. Dibutuhkan karena skrip di IntroOverlay menyetel
    // `data-intro="seen"` pada <html> saat HTML di-parse — sebelum React
    // hidrasi — sehingga atribut di klien memang sengaja berbeda dari yang
    // dirender server. Ini pola yang sama dipakai skrip anti-kedip tema.
    // Cakupannya satu tingkat, jadi ketidakcocokan sungguhan di dalam pohon
    // tetap dilaporkan.
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Menandai bahwa intro sudah tampil di sesi ini, supaya kunjungan
            berikutnya langsung melihat isi. `beforeInteractive` membuatnya
            berjalan sebelum hidrasi — sebuah <script> biasa di dalam komponen
            React tidak akan dieksekusi pada navigasi sisi klien. */}
        <Script id="intro-session" strategy="beforeInteractive">
          {INTRO_SESSION_SCRIPT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
