import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/siteUrl";
import "./app.css";
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
