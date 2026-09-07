import { AboutSection } from "@/components/AboutSection";
import { ContactSection } from "@/components/ContactSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { IntroOverlay } from "@/components/IntroOverlay";
import { Navbar } from "@/components/Navbar";
import { ProjectsSection } from "@/components/ProjectsSection";
import { getExperiences, getFeaturedProjects } from "@/lib/server/portfolio";

/**
 * Beranda — komponen SERVER.
 *
 * Sebelumnya berlabel "use client" dan menahan seluruh isinya di balik
 * `useState(showWelcome = true)`. Akibatnya HTML yang dikirim server hanya
 * berisi layar pembuka: nama, headline, keahlian, proyek, dan kontak sama
 * sekali tidak ada di dalamnya. Recruiter berkoneksi lambat, mesin pencari,
 * dan pratinjau tautan hanya melihat layar hitam.
 *
 * Sekarang: proyek dan pengalaman diambil di server, seluruh section dirender
 * langsung, dan intro pembuka menjadi lapisan yang tidak menghalangi apa pun
 * (lihat IntroOverlay).
 */

// Data portfolio jarang berubah; segarkan tiap 5 menit.
export const revalidate = 300;

export default async function Home() {
  // Diambil paralel — keduanya tidak saling bergantung.
  const [projects, experiences] = await Promise.all([
    getFeaturedProjects(),
    getExperiences(),
  ]);

  return (
    <div className="text-foreground min-h-screen bg-zinc-950">
      {/* Skip link: elemen fokus pertama, memungkinkan lompat ke konten utama. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-60 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-black focus:ring-2 focus:ring-white focus:outline-hidden"
      >
        Lewati ke konten
      </a>

      <IntroOverlay />

      <Navbar />

      <main id="main">
        <HeroSection />
        <AboutSection />
        <ExperienceSection experiences={experiences} />
        <ProjectsSection projects={projects} />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
