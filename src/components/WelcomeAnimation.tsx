"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [stage, setStage] = useState<"initial" | "colorReveal" | "exit">(
    "initial",
  );
  const prefersReducedMotion = useReducedMotion();

  const text = "PARANDITHA";
  const letters = text.split("");

  useEffect(() => {
    // Hormati preferensi reduce-motion: lewati splash sepenuhnya.
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // 1. Initial delay
    const t1 = setTimeout(() => setStage("colorReveal"), 400);
    // 2. Wait for color reveal, then complete
    const t2 = setTimeout(
      () => {
        setStage("exit");
        onComplete();
      },
      400 + letters.length * 100 + 1000,
    ); // 100ms per letter + 1s pause

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete, letters.length, prefersReducedMotion]);

  // Jalan keluar via keyboard: Enter/Escape melewati splash kapan saja.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-100 flex flex-col justify-between overflow-hidden bg-black p-6 font-sans text-white md:p-10"
      exit={{
        opacity: 0,
        scale: 1.05,
        transition: { duration: 0.8, ease: "easeInOut" },
      }}
    >
      {/* Tombol lewati: fokusable via keyboard, tampil saat difokus. */}
      <button
        type="button"
        onClick={onComplete}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-110 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-black focus:ring-2 focus:ring-white focus:outline-hidden"
      >
        Lewati intro
      </button>

      {/* Top right dot */}
      <motion.div
        className="flex w-full justify-end"
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <div className="h-2 w-2 rounded-full bg-gray-300 md:h-2.5 md:w-2.5"></div>
      </motion.div>

      {/* Center Text */}
      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
        <motion.div
          className="flex items-start tracking-tighter"
          exit={{
            y: -40,
            opacity: 0,
            transition: { duration: 0.6, ease: "easeOut" },
          }}
        >
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              className="text-[clamp(2.5rem,13vw,205px)] leading-none font-bold"
              initial={{ color: "#333333" }} // Dark gray
              animate={
                stage === "colorReveal" || stage === "exit"
                  ? { color: "#ffffff" }
                  : { color: "#333333" }
              }
              transition={{
                duration: 0.1,
                delay: stage === "colorReveal" ? index * 0.1 : 0,
              }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            className="mt-2 ml-1 text-3xl font-bold sm:text-4xl md:mt-4 md:ml-3 md:pt-4 md:text-[5vw]"
            initial={{ color: "#333333" }}
            animate={
              stage === "colorReveal" || stage === "exit"
                ? { color: "#ffffff" }
                : { color: "#333333" }
            }
            transition={{
              duration: 0.1,
              delay: stage === "colorReveal" ? letters.length * 0.1 : 0,
            }}
          >
            {/* ™ */}
          </motion.span>
        </motion.div>
      </div>

      {/* Footer Elements */}
      <motion.div
        className="flex flex-col items-center justify-between gap-6 font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase md:flex-row md:gap-0 md:text-xs"
        exit={{ opacity: 0, y: 20, transition: { duration: 0.5 } }}
      >
        <div className="flex items-center">© CURATED INTERFACES ビジュアル</div>
        {/* opacity dihapus: zinc-400 (7.76:1) sudah redup & tetap lolos AA. */}
        <div className="md:-ml-12">(WDX® — 02)</div>
        <div className="flex items-center gap-4">
          <span>DIGITAL DESIGNER</span>
          <div className="h-4 w-12 rounded-[4px] bg-white opacity-90"></div>
        </div>
      </motion.div>
    </motion.div>
  );
};
