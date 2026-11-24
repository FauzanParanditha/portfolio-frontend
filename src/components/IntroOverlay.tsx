"use client";

import { markIntroSeen } from "@/lib/intro";
import { useEffect, useRef } from "react";

/**
 * Intro pembuka — versi yang TIDAK menghalangi isi.
 *
 * Pengganti `WelcomeAnimation`, yang dulu menjadi gerbang: beranda menahan
 * seluruh isinya di balik `useState(true)` selama 2,4 detik, sehingga HTML
 * pertama hanya berisi layar pembuka dan crawler maupun pengunjung berkoneksi
 * lambat tidak melihat apa pun.
 *
 * Tiga hal yang membuat versi ini aman:
 *
 * 1. Ia LAPISAN, bukan gerbang. Isi beranda dirender penuh di HTML, intro cuma
 *    menumpuk di atasnya.
 * 2. `pointer-events: none` — pengunjung bisa langsung menggulir dan mengklik
 *    menembusnya. Tidak ada yang perlu ditunggu, jadi tidak perlu tombol lewati.
 * 3. Hilang sendiri lewat animasi CSS, bukan timer JavaScript. Kalau JS gagal
 *    dimuat sekalipun, intro tetap menyingkir dan isi tetap terbaca.
 *
 * Penandaan "sudah tampil" ada di src/lib/intro.ts: skrip inline di <head>
 * melewati intro sejak paint pertama pada kunjungan berikutnya, dan komponen
 * ini menandainya begitu animasinya selesai — supaya kembali ke beranda lewat
 * navigasi sisi klien tidak memutarnya lagi. Hanya itu alasan komponen ini
 * "use client"; tanpa JavaScript intro tetap menyingkir sendiri lewat CSS.
 */

const NAME = "PARANDITHA";

export const IntroOverlay = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const overlay = ref.current;
    if (!overlay) return;
    // Hidrasi bisa datang setelah animasinya selesai (JS lambat): saat itu
    // lapisannya sudah tak terlihat dan `animationend` tidak akan datang lagi.
    const style = getComputedStyle(overlay);
    if (style.display === "none" || style.visibility === "hidden") {
      markIntroSeen();
      return;
    }
    const onEnd = (event: AnimationEvent) => {
      // Animasi huruf ikut menggelembung ke sini; yang ditunggu animasi
      // lapisannya sendiri.
      if (event.target === overlay) markIntroSeen();
    };
    overlay.addEventListener("animationend", onEnd);
    return () => overlay.removeEventListener("animationend", onEnd);
  }, []);

  return (
    <div ref={ref} className="intro-overlay" aria-hidden="true">
      <div className="intro-overlay__dot" />

      <div className="intro-overlay__center">
        <div className="intro-overlay__word">
          {NAME.split("").map((letter, i) => (
            <span
              key={i}
              className="intro-overlay__letter"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      <div className="intro-overlay__foot">
        <span>Fullstack Programmer</span>
        <span>Go &middot; Next.js</span>
      </div>
    </div>
  );
};
