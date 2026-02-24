"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export const Navbar = () => {
  const links = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-thin"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl uppercase tracking-tighter">
          FP.
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Mobile menu could be a simple button, keeping it brutal and simple */}
        <div className="md:hidden font-mono text-xs uppercase tracking-widest opacity-50">
           [ MENU ]
        </div>
      </div>
    </motion.header>
  );
};
