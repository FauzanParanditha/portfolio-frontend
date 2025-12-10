"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

type Dot = { leftPct: number; topPct: number; delay: number };

// deterministic PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [showWelcome, setShowWelcome] = useState(true);

  // Generate particles deterministically so SSR === CSR
  const dots = useMemo<Dot[]>(() => {
    const N = 15;
    const rand = mulberry32(12345); // any fixed seed
    return Array.from({ length: N }, () => ({
      leftPct: rand() * 100, // 0–100%
      topPct: rand() * 100, // 0–100%
      delay: rand() * 2, // 0–2s
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
      setTimeout(onComplete, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!showWelcome) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background particles (percent-based positions) */}
      <div className="absolute inset-0">
        {dots.map((d, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/20"
            style={{ left: `${d.leftPct}%`, top: `${d.topPct}%` }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -100, opacity: [0, 1, 0] }}
            transition={{ duration: 3, delay: d.delay, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Welcome text animation */}
      <motion.div
        className="relative z-10 px-4 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1
          className="bg-gradient-to-r from-primary via-primary-foreground to-primary bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-5xl md:text-6xl lg:text-8xl"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Welcome
        </motion.h1>

        <motion.div
          className="mt-4 flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-primary/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
    </motion.div>
  );
};
