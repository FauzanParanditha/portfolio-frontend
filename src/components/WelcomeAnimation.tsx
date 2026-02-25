"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [stage, setStage] = useState<"initial" | "colorReveal" | "exit">("initial");
  
  const text = "PARANDITHA";
  const letters = text.split("");

  useEffect(() => {
    // 1. Initial delay
    const t1 = setTimeout(() => setStage("colorReveal"), 400);
    // 2. Wait for color reveal, then complete
    const t2 = setTimeout(() => {
      setStage("exit");
      onComplete();
    }, 400 + (letters.length * 100) + 1000); // 100ms per letter + 1s pause

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete, letters.length]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col justify-between p-6 md:p-10 text-white font-sans"
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      {/* Top right dot */}
      <motion.div 
        className="flex justify-end w-full"
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-gray-300 rounded-full"></div>
      </motion.div>

      {/* Center Text */}
      <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden">
        <motion.div 
          className="flex items-start tracking-tighter"
          exit={{ y: -40, opacity: 0, transition: { duration: 0.6, ease: "easeOut" } }}
        >
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              className="text-7xl sm:text-8xl md:text-[14vw] font-bold leading-none"
              initial={{ color: "#333333" }} // Dark gray
              animate={
                stage === "colorReveal" || stage === "exit" ? { color: "#ffffff" } : { color: "#333333" }
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
            className="text-3xl sm:text-4xl md:text-[5vw] font-bold ml-1 md:ml-3 mt-2 md:mt-4 md:pt-4"
            initial={{ color: "#333333" }}
            animate={
                stage === "colorReveal" || stage === "exit" ? { color: "#ffffff" } : { color: "#333333" }
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
        className="flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs text-zinc-500 tracking-[0.2em] uppercase gap-6 md:gap-0 font-mono"
        exit={{ opacity: 0, y: 20, transition: { duration: 0.5 } }}
      >
        <div className="flex items-center">
          © CURATED INTERFACES ビジュアル
        </div>
        <div className="opacity-60 md:-ml-12">
          (WDX® — 02)
        </div>
        <div className="flex items-center gap-4">
          <span>DIGITAL DESIGNER</span>
          <div className="w-12 h-4 bg-white rounded-[4px] opacity-90"></div>
        </div>
      </motion.div>
    </motion.div>
  );
};

