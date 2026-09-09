"use client";

import { canOptimizeImage } from "@/lib/imageHosts";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

/**
 * Galeri screenshot beserta lightbox-nya — SATU-SATUNYA bagian halaman detail
 * proyek yang butuh JavaScript.
 *
 * Diekstrak dari `page.tsx` supaya halaman itu bisa jadi komponen server. Grid
 * di bawah tetap dirender di HTML, jadi gambarnya terbaca crawler meski
 * lightbox-nya butuh klien.
 *
 * Ditambahkan saat ekstraksi (sebelumnya tidak ada):
 *   - Escape menutup lightbox.
 *   - Panah kiri/kanan berpindah gambar, bukan hanya klik.
 *   - `role="dialog"` + `aria-modal` supaya pembaca layar mengenalinya.
 *   - Gulir latar dibekukan selama lightbox terbuka.
 */
export function ScreenshotGallery({
  screenshots,
  projectTitle,
}: {
  screenshots: string[];
  projectTitle: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const isOpen = selected !== null;

  const close = useCallback(() => setSelected(null), []);
  const step = useCallback(
    (delta: number) =>
      setSelected((current) =>
        current === null
          ? null
          : (current + delta + screenshots.length) % screenshots.length,
      ),
    [screenshots.length],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);

    // Bekukan gulir latar; tanpa ini halaman di belakang lightbox ikut bergulir.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close, step]);

  if (screenshots.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {screenshots.map((screenshot, index) => (
          <button
            key={screenshot + index}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Perbesar screenshot ${index + 1} dari ${projectTitle}`}
            className="reveal-on-scroll group bg-muted/20 relative aspect-4/3 cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-hidden focus-visible:ring-inset"
          >
            <Image
              src={screenshot}
              alt={`${projectTitle} screenshot ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 motion-reduce:transition-none"
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              unoptimized={!canOptimizeImage(screenshot)}
            />
            <div className="bg-background/0 group-hover:bg-background/10 absolute inset-0 z-10 transition-colors" />
          </button>
        ))}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Screenshot ${selected + 1} dari ${screenshots.length}`}
          onClick={close}
          className="bg-background fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="text-foreground/50 hover:text-foreground absolute top-6 right-6 z-50 flex h-11 w-11 items-center justify-center transition-colors"
          >
            <X className="h-8 w-8" aria-hidden="true" />
          </button>

          {screenshots.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Screenshot sebelumnya"
              className="text-foreground/50 hover:text-foreground fixed top-1/2 left-6 z-50 hidden h-11 w-11 -translate-y-1/2 items-center justify-center md:flex"
            >
              <ChevronLeft className="h-10 w-10" aria-hidden="true" />
            </button>
          ) : null}

          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={selected}
              src={screenshots[selected]}
              alt={`${projectTitle} screenshot ${selected + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized={!canOptimizeImage(screenshots[selected])}
            />
          </div>

          {screenshots.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Screenshot berikutnya"
              className="text-foreground/50 hover:text-foreground fixed top-1/2 right-6 z-50 hidden h-11 w-11 -translate-y-1/2 items-center justify-center md:flex"
            >
              <ChevronRight className="h-10 w-10" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
