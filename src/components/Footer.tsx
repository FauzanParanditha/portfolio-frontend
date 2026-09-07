import { GithubIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { Mail } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    // external: true untuk tautan http (dibuka tab baru + rel aman); mailto tidak.
    {
      icon: GithubIcon,
      href: "https://github.com/FauzanParanditha",
      label: "GitHub",
      external: true,
    },
    {
      icon: LinkedinIcon,
      href: "https://www.linkedin.com/in/paranditha/",
      label: "LinkedIn",
      external: true,
    },
    {
      icon: Mail,
      href: "mailto:paranditha@gmail.com",
      label: "Email",
      external: false,
    },
  ];

  const quickLinks = [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <footer className="border-thin border-t bg-zinc-950 pt-32 pb-16">
      <div className="container mx-auto px-6">
        <div className="border-thin flex flex-col items-start justify-between gap-16 border-b pb-16 md:flex-row">
          <div className="flex w-full flex-col gap-8 md:w-1/2">
            <div className="section-title">
              Fauzan <br /> Paranditha
            </div>
            <p className="max-w-lg text-xl leading-relaxed font-medium mix-blend-difference md:text-2xl">
              Backend-leaning fullstack programmer. I build Go APIs and Next.js
              interfaces that stay readable as the product grows.
            </p>
          </div>

          <div className="flex w-full flex-col gap-16 sm:flex-row md:w-1/2 md:justify-end md:gap-32">
            <div className="flex flex-col gap-6">
              <span className="eyebrow">[ NAVIGATION ]</span>
              <nav aria-label="Navigasi footer" className="flex flex-col gap-4">
                {quickLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="rounded-sm text-lg font-bold tracking-widest uppercase underline-offset-8 transition-all hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
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
                    className="flex items-center gap-3 rounded-sm text-lg font-bold tracking-widest uppercase underline-offset-8 transition-all hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
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
        <div className="eyebrow flex flex-col items-center justify-between gap-6 pt-8 tabular-nums md:flex-row">
          <p>© {currentYear} FAUZAN PARANDITHA.</p>
          <p>TANGERANG SELATAN, ID</p>
          <p>ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
};
