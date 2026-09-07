import { GithubIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Hero beranda — komponen SERVER.
 *
 * Dulu berlabel "use client" hanya demi animasi masuk framer-motion. Akibatnya
 * seluruh teks hero tertulis `opacity: 0` di HTML dan baru terlihat setelah
 * React terhidrasi. Sekarang animasinya memakai utility CSS `rise-in`
 * (lihat globals.css) yang mulai berjalan begitu markup di-parse — tidak ada
 * JavaScript sama sekali di jalur render bagian atas halaman.
 *
 * Jeda antar-elemen memakai `animationDelay`, meniru `staggerChildren: 0.15`
 * yang sebelumnya dipakai.
 */

// Tautan profil — nilainya sama dengan yang dipakai Footer.
const GITHUB_URL = "https://github.com/FauzanParanditha";
const LINKEDIN_URL = "https://www.linkedin.com/in/paranditha/";

/**
 * URL CV. Diambil dari env supaya berkasnya bisa diganti tanpa menyentuh kode
 * — dan supaya tombolnya TIDAK tampil bila berkasnya belum ada, alih-alih
 * mengirim recruiter ke halaman 404.
 *
 * Isi `NEXT_PUBLIC_CV_URL` di `.env.local`, mis. `/cv/fauzan-paranditha.pdf`
 * setelah menaruh berkasnya di `public/cv/`.
 */
const CV_URL = process.env.NEXT_PUBLIC_CV_URL;

if (!CV_URL && process.env.NODE_ENV !== "production") {
  console.warn(
    '[hero] NEXT_PUBLIC_CV_URL belum di-set — tombol "Download CV" disembunyikan. ' +
      "Ini aksi yang paling dicari recruiter; lihat docs/POLISH-BACKLOG.md.",
  );
}

export const HeroSection = () => {
  return (
    // `min-h-svh`, bukan `h-screen`: hero boleh tumbuh bila isinya bertambah
    // (mis. baris tombol di bawah), dan `svh` menghindari lompatan tinggi saat
    // bilah alamat browser ponsel muncul-hilang.
    <section className="relative flex min-h-svh w-full flex-col justify-between overflow-hidden bg-zinc-950 pt-20 font-sans text-white md:pt-28">
      <div className="relative flex w-full grow flex-col">
        {/* Main Content Area */}
        <div className="relative mx-auto flex w-full max-w-[1400px] grow flex-col px-5 pt-6 sm:px-8 md:pt-10 lg:px-14">
          {/* Main Headline */}
          <div className="rise-in relative z-10 max-w-3xl">
            <h1 className="text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl md:text-5xl lg:text-[4rem]">
              Building reliable web
              <br />
              applications with clean
              <br />
              architecture, strong
              <br />
              performance, and real impact.
            </h1>
          </div>

          {/* Aksi utama. Sengaja di bawah headline dan TIDAK disembunyikan di
              breakpoint mana pun — inilah yang dicari recruiter lebih dulu. */}
          <div
            className="rise-in mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "100ms" }}
          >
            <Button asChild size="lg">
              <Link href="/projects">View projects</Link>
            </Button>

            {CV_URL ? (
              <Button asChild size="lg" variant="outline">
                <a href={CV_URL} target="_blank" rel="noopener noreferrer">
                  Download CV
                </a>
              </Button>
            ) : null}

            <div className="flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profil GitHub"
                className="flex items-center gap-2 rounded-sm border border-zinc-700 px-4 py-2.5 text-xs tracking-widest uppercase transition-colors hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
              >
                <GithubIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profil LinkedIn"
                className="flex items-center gap-2 rounded-sm border border-zinc-700 px-4 py-2.5 text-xs tracking-widest uppercase transition-colors hover:border-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden"
              >
                <LinkedinIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Kartu kredibilitas.
              Dulu `hidden lg:flex`, sehingga angka-angka ini LENYAP di ponsel
              dan tablet — justru perangkat yang paling sering dipakai recruiter
              memindai. Kini satu elemen yang sama: mengalir di bawah tombol
              pada layar kecil, mengambang di kanan mulai lg. */}
          <div
            className="rise-in relative z-20 mt-10 flex w-full flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-2xl lg:absolute lg:top-8 lg:right-14 lg:mt-0 lg:w-[400px]"
            style={{ animationDelay: "150ms" }}
          >
            {/* Kartu latar putih: override eyebrow ke zinc-600 (7.73:1 di putih). */}
            <p className="eyebrow text-zinc-600">Current Focus</p>
            {/* Kalimat ini hiasan desktop; di layar kecil ruangnya dipakai
                untuk angka, yang jauh lebih berguna bagi pembaca. */}
            <p className="hidden text-2xl leading-tight font-semibold lg:block">
              Scalable product features, readable code, and measurable business
              outcomes.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="flex flex-col justify-between border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">5+</p>
                <p className="eyebrow text-zinc-600">Years</p>
              </div>
              <div className="flex flex-col justify-between border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">Go·TS</p>
                <p className="eyebrow text-zinc-600">Core stack</p>
              </div>
              <div className="flex flex-col justify-between border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">76%</p>
                <p className="eyebrow text-zinc-600">Handler tests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Stripe */}
        <div className="z-10 mx-auto mt-6 w-full max-w-[1400px] px-5 sm:px-8 md:mt-10 lg:px-14">
          <div
            className="hide-scrollbar eyebrow rise-in flex h-auto w-full justify-between gap-3 overflow-x-auto bg-white py-1.5 whitespace-nowrap text-black md:justify-around md:gap-4"
            style={{ animationDelay: "300ms" }}
          >
            <span>Web Development</span>
            <span>API Engineering</span>
            <span>System Design</span>
          </div>
        </div>

        {/* Massive Bottom Text */}
        <div className="relative mt-4 flex w-full grow items-center overflow-hidden md:mt-8">
          <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-14">
            <div
              className="rise-in flex items-start tracking-tighter"
              style={{ animationDelay: "450ms" }}
            >
              <span className="text-[clamp(2.5rem,14vw,205px)] leading-none font-bold text-white">
                PARANDITHA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Bottom Bar */}
      <div
        className="rise-in w-full border-t border-zinc-800"
        style={{ animationDelay: "600ms" }}
      >
        <div className="eyebrow mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-5 py-3 sm:px-8 md:flex-row md:gap-0 md:py-6 lg:px-14">
          <div className="flex items-center">© Fauzan Paranditha</div>
          {/* opacity dihapus: zinc-400 (7.76:1) sudah cukup redup & tetap lolos AA. */}
          <div className="md:-ml-12">(Portfolio - 2026)</div>
          <div className="flex items-center gap-4">
            <span>Fullstack Programmer</span>
            <div className="h-4 w-12 rounded-[4px] bg-white opacity-90"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
