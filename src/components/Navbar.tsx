"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const Navbar = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollBuffer = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 10) {
        setIsVisible(true);
        scrollBuffer.current = 0;
        lastScrollY.current = currentY;
        return;
      }

      const delta = currentY - lastScrollY.current;
      scrollBuffer.current += delta;

      if (scrollBuffer.current > 14) {
        setIsVisible(false);
        scrollBuffer.current = 0;
      } else if (scrollBuffer.current < -14) {
        setIsVisible(true);
        scrollBuffer.current = 0;
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape menutup menu. Ini disclosure, bukan modal, jadi sengaja TIDAK
  // memasang focus trap — tautan di dalamnya tetap bagian dari urutan Tab
  // halaman, yang justru lebih sesuai untuk daftar navigasi.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const links = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  // Sembunyi/muncul saat gulir memakai transisi CSS, bukan framer-motion.
  // Navbar adalah pemakai terakhir pustaka itu di jalur beranda; melepasnya
  // mengeluarkan framer-motion sepenuhnya dari bundel halaman publik.
  // Posisi awal `translate-y-0`: navbar terlihat sejak paint pertama, tidak
  // lagi meluncur masuk setelah hidrasi.
  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none ${
        isVisible || menuOpen ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between px-5 py-4 text-zinc-400 sm:px-8 md:py-5 lg:px-14">
        <Link
          href="/"
          className="rounded-sm text-lg leading-none font-medium tracking-tight text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden sm:text-2xl md:text-[2rem]"
        >
          PARANDITHA
        </Link>

        {/* Navigasi utama (desktop) — beri label agar tak ambigu dgn versi mobile. */}
        <nav
          aria-label="Navigasi utama"
          className="hidden flex-col gap-1 md:flex"
        >
          <span className="text-xl leading-none font-semibold text-white">
            Quick Links
          </span>
          <div className="flex flex-row gap-2 text-xl leading-none text-zinc-400">
            {links.map((link) => (
              <span key={link.name}>
                <Link
                  href={link.href}
                  className="rounded-sm transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
                >
                  {link.name}
                </Link>
              </span>
            ))}
          </div>
        </nav>

        <div className="hidden flex-col gap-1 text-right md:flex md:text-left">
          <span className="text-xl leading-none font-semibold text-white">
            Based in Indonesia
          </span>
          <span className="text-xl leading-none text-zinc-400">
            Fullstack Programmer
          </span>
        </div>

        {/* Pemicu menu ponsel.
            Dulu empat tautan `text-xs` berjajar — target sentuhnya jauh di
            bawah 44 px yang direkomendasikan, jadi mudah salah tekan. Kini satu
            tombol 44x44 yang membuka panel berisi tautan berukuran layak. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="menu-ponsel"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-sm text-zinc-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden md:hidden"
        >
          {menuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Panel menu ponsel. Setiap tautan minimal 44 px tingginya dan selebar
          penuh, jadi mudah disentuh dengan jempol. Menyertakan lokasi & peran
          yang di layar kecil tidak muncul di baris atas. */}
      {/* Selalu dirender, disembunyikan lewat atribut `hidden` — bukan dilepas
          dari DOM. Sebab `aria-controls` di tombol pemicu harus menunjuk elemen
          yang benar-benar ada, termasuk saat menunya tertutup. Elemen ini tidak
          punya utility display, jadi `hidden` bawaan peramban berlaku. */}
      <nav
        id="menu-ponsel"
        hidden={!menuOpen}
        aria-label="Navigasi utama"
        className="border-t border-zinc-800 md:hidden"
      >
        <ul className="flex flex-col py-2">
          {links.map((link) => (
            <li key={link.name}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center px-5 text-base text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden focus-visible:ring-inset sm:px-8"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="eyebrow border-t border-zinc-800 px-5 py-4 sm:px-8">
          Based in Indonesia &middot; Fullstack Programmer
        </div>
      </nav>
    </header>
  );
};
