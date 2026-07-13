import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    // external: true untuk tautan http (dibuka tab baru + rel aman); mailto tidak.
    {
      icon: Github,
      href: "https://github.com/FauzanParanditha",
      label: "GitHub",
      external: true,
    },
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/in/paranditha/",
      label: "LinkedIn",
      external: true,
    },
    { icon: Mail, href: "mailto:paranditha@gmail.com", label: "Email", external: false },
  ];

  const quickLinks = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <footer className="border-t border-thin bg-zinc-950 pt-32 pb-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-16 md:flex-row justify-between items-start border-b border-thin pb-16">
          <div className="flex flex-col gap-8 w-full md:w-1/2">
             <div className="section-title">
               Fauzan <br/> Paranditha
             </div>
             <p className="text-xl md:text-2xl font-medium max-w-lg leading-relaxed mix-blend-difference">
               Brutal efficiency. Elegant implementation. I build digital realities for modern brands.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-16 md:gap-32 w-full md:w-1/2 md:justify-end">
             <div className="flex flex-col gap-6">
                <span className="eyebrow">[ NAVIGATION ]</span>
                <nav aria-label="Navigasi footer" className="flex flex-col gap-4">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="rounded-sm text-lg uppercase tracking-widest font-bold hover:underline underline-offset-8 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
             </div>

             <div className="flex flex-col gap-6">
                <span className="eyebrow">[ SOCIALS ]</span>
                <nav aria-label="Tautan sosial" className="flex flex-col gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      {...(social.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="rounded-sm text-lg uppercase tracking-widest font-bold hover:underline underline-offset-8 transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      <social.icon className="h-5 w-5" aria-hidden="true" />
                      {social.label}
                    </a>
                  ))}
                </nav>
             </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6 eyebrow tabular-nums">
          <p>
            © {currentYear} FAUZAN PARANDITHA.
          </p>
          <p>
            TANGERANG SELATAN, ID
          </p>
          <p>
            ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
};
