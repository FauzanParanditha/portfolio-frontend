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
          className="bg-background text-foreground min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Navbar />
          <HeroSection />
          <AboutSection />
          <ExperienceSection />
          <ProjectsSection />
          <ContactSection />
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
