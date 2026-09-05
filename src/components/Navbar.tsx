"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const Navbar = () => {
  const [isVisible, setIsVisible] = useState(true);
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

  const links = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: isVisible ? 0 : -110, opacity: isVisible ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.7 }}
      className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md will-change-transform"
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

        {/* Navigasi utama (mobile) — landmark <nav> dgn label pembeda. */}
        <nav
          aria-label="Navigasi utama (mobile)"
          className="flex flex-col gap-1 text-xs opacity-80 md:hidden"
        >
          <span className="text-xs leading-none font-semibold text-white">
            Quick Links
          </span>
          <div className="flex flex-row gap-1 text-xs leading-none text-zinc-400">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="rounded-sm leading-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </motion.header>
  );
};
