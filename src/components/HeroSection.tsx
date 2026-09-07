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
export const HeroSection = () => {
  return (
    <section className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-zinc-950 pt-20 font-sans text-white md:pt-28">
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

          {/* Floating Focus Card */}
          <div
            className="rise-in absolute top-8 right-14 z-20 hidden w-[400px] flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-2xl lg:flex"
            style={{ animationDelay: "150ms" }}
          >
            {/* Kartu latar putih: override eyebrow ke zinc-600 (7.73:1 di putih). */}
            <p className="eyebrow text-zinc-600">Current Focus</p>
            <p className="text-2xl leading-tight font-semibold">
              Scalable product features, readable code, and measurable business
              outcomes.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">5+</p>
                <p className="eyebrow text-zinc-600">Years</p>
              </div>
              <div className="border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">30+</p>
                <p className="eyebrow text-zinc-600">Features</p>
              </div>
              <div className="border border-zinc-300 p-3">
                <p className="stat-num text-xl font-bold">99%</p>
                <p className="eyebrow text-zinc-600">Uptime</p>
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
