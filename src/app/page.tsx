"use client";

import { AboutSection } from "@/components/AboutSection";
import { ContactSection } from "@/components/ContactSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { Navbar } from "@/components/Navbar";
import { ProjectsSection } from "@/components/ProjectsSection";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <AnimatePresence mode="wait">
      {showWelcome ? (
        <WelcomeAnimation key="welcome" onComplete={() => setShowWelcome(false)} />
      ) : (
        <motion.div
          key="main"
          className="min-h-screen bg-zinc-950 text-foreground"
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Skip link: elemen fokus pertama, memungkinkan lompat ke konten utama. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-black focus:outline-none focus:ring-2 focus:ring-white"
          >
            Lewati ke konten
          </a>
          <Navbar />
          <main id="main">
            <HeroSection />
            <AboutSection />
            <ExperienceSection />
            <ProjectsSection />
            <ContactSection />
          </main>
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
