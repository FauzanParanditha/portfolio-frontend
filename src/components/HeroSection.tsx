import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
    hidden: { opacity: 0, y: 40 },
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
    <section className="relative min-h-screen w-full bg-background pt-32 pb-16 flex flex-col justify-between border-b border-thin">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-6 h-full flex flex-col justify-between flex-grow"
      >
        {/* Top Meta Info */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 uppercase text-xs tracking-widest text-muted-foreground font-mono">
          <div className="flex gap-4 items-center">
            <span className="w-16 h-px bg-muted-foreground/30"></span>
            <span>(WDX® — 01)</span>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            Based in Indonesia
            <br />
            Fullstack Web Developer
          </div>
        </motion.div>

        {/* Massive Headline */}
        <div className="flex-grow flex flex-col justify-center gap-12">
          <motion.div variants={itemVariants} className="w-full">
            <h1 className="text-huge font-bold uppercase tracking-tight text-foreground leading-[0.85] flex flex-col">
              <span>Digital</span>
              <span className="ml-0 md:ml-32">Realities.</span>
            </h1>
          </motion.div>

          {/* Description & Image Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end w-full">
            <div className="md:col-span-4 flex flex-col gap-8 order-2 md:order-1">
              <p className="text-lg md:text-xl text-muted-foreground max-w-sm leading-relaxed">
                13+ years of digital form, sharp interactions, and relentless creative discipline and effort.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href={"#contact"}>
                  <Button size="lg" className="border-thin bg-foreground text-background hover:bg-transparent hover:text-foreground">
                    Contact
                  </Button>
                </Link>
                <Link href={"#projects"}>
                  <Button variant="outline" size="lg" className="border-thin">
                    <MoveRight className="mr-2 h-4 w-4" />
                    Works
                  </Button>
                </Link>
              </div>
            </div>

            <div className="md:col-span-8 flex justify-end order-1 md:order-2">
               <div className="relative w-full md:w-[80%] aspect-[4/3] md:aspect-video overflow-hidden">
                <Image
                  alt="Portfolio Visual"
                  src={"/images/zns.webp"}
                  fill
                  className="object-cover object-center grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Marquee or Footer Line for Hero */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="w-full border-t border-thin mt-16 pt-6 px-6 container mx-auto flex justify-between uppercase text-xs tracking-widest text-muted-foreground font-mono"
      >
        <span>Fauzan Paranditha</span>
        <span>Creative Development</span>
      </motion.div>
    </section>
  );
};
