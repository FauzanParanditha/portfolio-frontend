import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowDown, Github, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const HeroSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover opacity-10"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0"></div>
      </div>

      {/* Animated background elements */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute right-20 top-20 h-32 w-32 rounded-full border border-primary/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 left-20 h-24 w-24 rounded-full border border-accent-pink/20"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container z-10 mx-auto px-6 text-center"
      >
        <motion.div variants={itemVariants}>
          <motion.div
            animate={floatingAnimation}
            className="mx-auto mb-8 h-40 w-40 rounded-full bg-gradient-primary p-1"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background bg-gradient-primary bg-clip-text text-6xl font-bold">
              <Image
                alt="People"
                src={"/images/zns.webp"}
                width={150}
                height={150}
                className="rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="mb-6 bg-gradient-primary bg-clip-text text-5xl font-bold text-transparent md:text-7xl"
        >
          Fauzan Paranditha
        </motion.h1>

        <motion.h2
          variants={itemVariants}
          className="mb-8 text-2xl text-muted-foreground md:text-3xl"
        >
          Fullstack Web Developer
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          I craft exceptional digital experiences with modern technologies.
          Passionate about creating scalable solutions that make a difference.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mb-16 flex flex-wrap justify-center gap-4"
        >
          <Link href={"#contact"}>
            <Button
              size="lg"
              className="bg-gradient-primary transition-all duration-300 hover:shadow-glow"
            >
              <Mail className="mr-2 h-5 w-5" />
              Get In Touch
            </Button>
          </Link>

          <Link href={"#projects"}>
            <Button variant="outline" size="lg" className="border-primary">
              <Github className="mr-2 h-5 w-5" />
              View Work
            </Button>
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-6"
        >
          <motion.a
            whileHover={{ scale: 1.1, rotate: 5 }}
            href="https://github.com/FauzanParanditha"
            className="rounded-full border border-primary/20 p-3 transition-all duration-300 hover:border-primary hover:shadow-glow"
          >
            <Github className="h-6 w-6" />
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.1, rotate: -5 }}
            href="https://www.linkedin.com/in/paranditha/"
            className="rounded-full border border-primary/20 p-3 transition-all duration-300 hover:border-primary hover:shadow-glow"
          >
            <Linkedin className="h-6 w-6" />
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.1, rotate: 5 }}
            href="mailto:paranditha@gmail.com"
            className="rounded-full border border-primary/20 p-3 transition-all duration-300 hover:border-primary hover:shadow-glow"
          >
            <Mail className="h-6 w-6" />
          </motion.a>
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 transform"
      >
        <ArrowDown className="h-6 w-6 text-muted-foreground" />
      </motion.div>
    </section>
  );
};
