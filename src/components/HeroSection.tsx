"use client";

import { motion } from "framer-motion";

export const HeroSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        duration: 0.8,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-black pt-20 font-sans text-white md:pt-28">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative flex w-full flex-grow flex-col"
      >
        {/* Main Content Area */}
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-grow flex-col px-5 pt-6 sm:px-8 md:pt-10 lg:px-14">
          {/* Main Headline */}
          <motion.div
            variants={itemVariants}
            className="relative z-10 max-w-3xl"
          >
            <h1 className="text-[3rem] font-medium leading-[1.05] tracking-tight sm:text-4xl md:text-5xl lg:text-[4rem]">
              Building reliable web
              <br />
              applications with clean
              <br />
              architecture, strong
              <br />
              performance, and real impact.
            </h1>
          </motion.div>

          {/* Floating Focus Card */}
          <motion.div
            variants={itemVariants}
            className="absolute right-14 top-8 z-20 hidden w-[400px] flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-2xl lg:flex"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Current Focus
            </p>
            <p className="text-2xl font-semibold leading-tight">
              Scalable product features, readable code, and measurable business
              outcomes.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="border border-zinc-300 p-3">
                <p className="text-xl font-bold">5+</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Years
                </p>
              </div>
              <div className="border border-zinc-300 p-3">
                <p className="text-xl font-bold">30+</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Features
                </p>
              </div>
              <div className="border border-zinc-300 p-3">
                <p className="text-xl font-bold">99%</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Uptime
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Middle Stripe */}
        <div className="z-10 mx-auto mt-6 w-full max-w-[1400px] px-5 sm:px-8 md:mt-10 lg:px-14">
          <motion.div
            variants={itemVariants}
            className="hide-scrollbar flex h-auto w-full justify-between gap-3 overflow-x-auto whitespace-nowrap bg-white py-1.5 text-[9px] font-bold uppercase tracking-wider text-black md:justify-around md:gap-4 md:text-xs md:tracking-widest"
          >
            <span>Web Development</span>
            <span>API Engineering</span>
            <span>System Design</span>
          </motion.div>
        </div>

        {/* Massive Bottom Text */}
        <div className="relative mt-4 flex w-full flex-grow items-center overflow-hidden md:mt-8">
          <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-14">
            <motion.div
              variants={itemVariants}
              className="flex items-start tracking-tighter"
            >
              <span className="text-5xl font-bold leading-none text-white sm:text-[10vw] md:text-[14vw] xl:text-[10.5vw]">
                PARANDITHA
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Footer / Bottom Bar (matches welcome animation) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="w-full border-t border-zinc-800"
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500 sm:px-8 md:flex-row md:gap-0 md:py-6 md:text-xs md:tracking-[0.2em] lg:px-14">
          <div className="flex items-center">© Fullstack Engineering</div>
          <div className="opacity-60 md:-ml-12">(Portfolio - 2026)</div>
          <div className="flex items-center gap-4">
            <span>Programmer</span>
            <div className="h-4 w-12 rounded-[4px] bg-white opacity-90"></div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
