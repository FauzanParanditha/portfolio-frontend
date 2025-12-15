"use client";
import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useReducedMotion } from "framer-motion";
import { JSX, useEffect, useMemo } from "react";

type TextGenerateEffectLoopProps = {
  words: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  colorClass?: string;
  /** Durasi 1 siklus: fade-in → hold → fade-out (detik) */
  cycleDuration?: number; // default 2.4
  /** Jeda antar kata (detik) */
  staggerDelay?: number; // default 0.08
  /** Delay awal sebelum animasi mulai (detik) */
  delay?: number; // default 0.0
  /** Proporsi waktu untuk fade-in / hold / fade-out (jumlah = 1) */
  weights?: { fadeIn: number; hold: number; fadeOut: number }; // default {0.25, 0.5, 0.25}
  /** Jeda antar siklus (detik) */
  repeatGap?: number; // default 0.3
};

export function TextGenerateEffectLoop({
  words,
  className,
  as: As = "div",
  colorClass = "text-cyan-600 ",
  cycleDuration = 2.4,
  staggerDelay = 0.08,
  delay = 0,
  weights = { fadeIn: 0.25, hold: 0.5, fadeOut: 0.25 },
  repeatGap = 0.3,
}: TextGenerateEffectLoopProps) {
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();

  const wordsArray = useMemo(
    () => words.trim().split(/\s+/).filter(Boolean),
    [words],
  );

  useEffect(() => {
    if (!scope.current) return;

    if (reduce) {
      // Tampilkan langsung tanpa animasi
      animate(
        "span",
        { opacity: 1, y: 0, filter: "blur(0px)" },
        { duration: 0 },
      );
      return;
    }

    const t0 = 0;
    const t1 = weights.fadeIn; // akhir fade-in
    const t2 = t1 + weights.hold; // akhir hold
    const t3 = t2 + weights.fadeOut; // akhir fade-out (harus 1)

    // Pastikan total = 1 (fallback aman)
    const total = t3 || 1;
    const times = [t0 / total, t1 / total, t2 / total, 1];

    const controls = animate(
      "span",
      {
        opacity: [0, 1, 1, 0],
        y: [4, 0, 0, 4],
        filter: ["blur(2px)", "blur(0px)", "blur(0px)", "blur(2px)"],
      },
      {
        duration: cycleDuration,
        times,
        ease: "easeInOut",
        delay: stagger(staggerDelay, { startDelay: delay }),
        repeat: Infinity, // loop mulus (kembali ke keyframe awal)
        repeatType: "loop",
        repeatDelay: repeatGap, // sedikit jeda antar siklus agar terasa bernapas
      },
    );

    return () => {
      controls?.stop?.();
    };
  }, [
    animate,
    scope,
    reduce,
    cycleDuration,
    staggerDelay,
    delay,
    weights.fadeIn,
    weights.hold,
    weights.fadeOut,
    repeatGap,
  ]);

  return (
    <As className={cn("font-bold", className)}>
      <div className="mt-4">
        <div
          ref={scope}
          className="text-2xl leading-snug tracking-wide text-black"
          role="text"
          aria-label={words}
        >
          {wordsArray.map((word, idx) => (
            <motion.span
              key={`${word}-${idx}`}
              className={cn(colorClass)}
              style={{
                opacity: 0,
                filter: "blur(2px)",
                display: "inline-block",
                transform: "translateY(4px)",
                marginRight: "0.25em",
              }}
            >
              {word + (idx < wordsArray.length - 1 ? " " : "")}
            </motion.span>
          ))}
        </div>
      </div>
    </As>
  );
}
