"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Setting up the fast counter animation
    const duration = 1200; // 1.2s Fast loading
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCount(100);
        clearInterval(timer);
        setTimeout(() => {
          onComplete(); // Triggers exit animation in AnimatePresence
        }, 400); // Hold at 100% for 400ms before exit
      } else {
        const progress = currentStep / steps;
        // Ease out expo for snappy start and slow end
        const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(Math.floor(easeOutProgress * 100));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-foreground text-background overflow-hidden"
      initial={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Meta */}
      <div className="flex justify-between items-start font-mono text-xs md:text-sm uppercase tracking-widest opacity-70">
        <span>SYSTEM_BOOT SEQUENCE...</span>
        <span>WDX® — 01</span>
      </div>

      {/* Massive Loading Text & Counter */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-12">
        <span className="text-huge font-bold tracking-tighter leading-[0.8] uppercase flex flex-col">
          <span>Loading</span>
          <span>Digital</span>
          <span>Realities.</span>
        </span>
        <span className="text-huge font-bold leading-[0.8] mb-[-0.5rem] md:mb-[-1.5rem] text-right md:text-left">
          {count}%
        </span>
      </div>
    </motion.div>
  );
};
