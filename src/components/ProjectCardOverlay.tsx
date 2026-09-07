/**
 * Tirai gelap + ajakan yang muncul di atas cover saat kartu proyek disentuh
 * kursor atau difokus keyboard.
 *
 * Kenapa CSS, bukan `whileHover` framer-motion seperti rencana awal di artifact
 * Audit Motion: kartu proyek dirender komponen SERVER, dan memakai framer-motion
 * akan menariknya kembali ke bundel klien — membatalkan pekerjaan melepas
 * pustaka itu dari jalur beranda. Efek yang sama bisa didapat dengan
 * `group-hover`, tanpa satu byte JavaScript.
 *
 * Fungsinya bukan hiasan: sebelumnya hover hanya membesarkan gambar, tanpa
 * petunjuk bahwa gambarnya bisa diklik. Sekarang ada afordansi yang jelas.
 *
 * `group-focus-within` ikut dipasang supaya pengguna keyboard mendapat isyarat
 * yang sama — tautan di dalam kartu yang difokus membuat pembungkus `.group`
 * cocok dengan `:focus-within`.
 *
 * `pointer-events-none` wajib: tanpa itu lapisan ini menghalangi klik ke tautan
 * di bawahnya.
 */
export function ProjectCardOverlay() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-4 flex translate-y-2 items-end justify-between gap-3 opacity-0 transition-all duration-300 ease-[0.16_1_0.3_1] group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none"
      >
        <span className="font-mono text-[10px] tracking-[0.16em] text-zinc-100 uppercase">
          View project
        </span>
        <span className="font-mono text-base leading-none text-cyan-400">
          &#8599;
        </span>
      </div>
    </>
  );
}
