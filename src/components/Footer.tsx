import { Github, Linkedin, Mail, Twitter } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Mail, href: "#", label: "Email" },
  ];

  const quickLinks = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <footer className="border-t border-thin bg-background pt-32 pb-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-16 md:flex-row justify-between items-start border-b border-thin pb-16">
          <div className="flex flex-col gap-8 w-full md:w-1/2">
             <div className="text-display font-bold uppercase tracking-tight leading-[0.9]">
               Fauzan <br/> Paranditha
             </div>
             <p className="text-xl md:text-2xl font-medium max-w-lg leading-relaxed mix-blend-difference">
               Brutal efficiency. Elegant implementation. I build digital realities for modern brands.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-16 md:gap-32 w-full md:w-1/2 md:justify-end">
             <div className="flex flex-col gap-6">
                <span className="font-mono text-xs uppercase tracking-widest opacity-50">[ NAVIGATION ]</span>
                <nav className="flex flex-col gap-4">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="text-lg uppercase tracking-widest font-bold hover:underline underline-offset-8 transition-all"
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
             </div>

             <div className="flex flex-col gap-6">
                <span className="font-mono text-xs uppercase tracking-widest opacity-50">[ SOCIALS ]</span>
                <nav className="flex flex-col gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      className="text-lg uppercase tracking-widest font-bold hover:underline underline-offset-8 transition-all flex items-center gap-3"
                    >
                      <social.icon className="h-5 w-5" />
                      {social.label}
                    </a>
                  ))}
                </nav>
             </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6 font-mono text-xs uppercase tracking-widest opacity-50">
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
