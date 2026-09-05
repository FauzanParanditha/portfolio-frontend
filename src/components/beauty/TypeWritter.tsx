"use client";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Word = { text: string; className?: string };

type TypewriterLoopProps = {
  words: Word[]; // setiap item dianggap 1 frasa penuh (bukan per-kata)
  className?: string;
  cursorClassName?: string;
  typingSpeed?: number; // ms per karakter saat mengetik
  deletingSpeed?: number; // ms per karakter saat menghapus
  pauseBetween?: number; // jeda (ms) setelah selesai mengetik sebelum menghapus
  startDelay?: number; // jeda (ms) sebelum mulai pertama kali
  loop?: boolean; // true = ulang terus
};

export function TypewriterLoop({
  words,
  className,
  cursorClassName,
  typingSpeed = 90,
  deletingSpeed = 40,
  pauseBetween = 1200,
  startDelay = 300,
  loop = true,
}: TypewriterLoopProps) {
  const reduce = useReducedMotion();
  const items = useMemo(() => (words ?? []).filter(Boolean), [words]);

  const [index, setIndex] = useState(0); // index frasa saat ini
  const [sub, setSub] = useState(0); // panjang substring yang terlihat
  // Fase "pausing" dihapus: jeda setelah selesai mengetik kini cukup ditangani
  // oleh timer menuju "deleting", tanpa transisi state perantara.
  const [phase, setPhase] = useState<"idle" | "typing" | "deleting">("idle");
  const [stopped, setStopped] = useState(false);

  // Kickoff
  useEffect(() => {
    // Saat prefers-reduced-motion aktif, teks ditampilkan utuh lewat `visible`
    // di bawah — tidak perlu menyetel state apa pun di sini (dulu setPhase +
    // setSub sinkron di dalam effect, yang memicu render berantai).
    if (!items.length || reduce) return;
    const t = setTimeout(() => setPhase("typing"), startDelay);
    return () => clearTimeout(t);
  }, [items, reduce, startDelay]);

  // Mesin state: typing → pausing → deleting → next
  useEffect(() => {
    if (!items.length || reduce || stopped) return;
    const current = items[index]?.text ?? "";

    let t: ReturnType<typeof setTimeout>;

    // Semua perpindahan state dijadwalkan lewat timer, tidak ada setState
    // sinkron di badan effect — itu yang memicu cascading render.
    if (phase === "typing") {
      t =
        sub < current.length
          ? setTimeout(() => setSub((s) => s + 1), typingSpeed)
          : // Selesai mengetik: tahan `pauseBetween`, lalu mulai menghapus.
            setTimeout(() => setPhase("deleting"), pauseBetween);
    } else if (phase === "deleting") {
      t = setTimeout(() => {
        if (sub > 0) {
          setSub((s) => s - 1);
          return;
        }

        // Sudah kosong: lanjut ke frasa berikutnya, atau berhenti di akhir
        // daftar bila loop dimatikan.
        const next = index + 1;
        if (!loop && next >= items.length) {
          setStopped(true);
          setPhase("idle");
          return;
        }
        setIndex(next % items.length);
        setPhase("typing");
      }, deletingSpeed);
    }
    return () => clearTimeout(t);
  }, [
    items,
    index,
    sub,
    phase,
    typingSpeed,
    deletingSpeed,
    pauseBetween,
    loop,
    reduce,
    stopped,
  ]);

  if (!items.length) return null;

  const current = items[index];
  const visible = reduce ? current.text : (current.text ?? "").slice(0, sub);

  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span
        className={cn("text-black", current?.className)}
        aria-live="polite"
        aria-atomic="true"
        style={{ whiteSpace: "pre" }} // jaga spasi apa adanya
      >
        {visible || "\u00A0"}
      </span>

      {/* Kursor berkedip */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse", // kedip bolak-balik
        }}
        className={cn(
          "block h-5 w-[3px] rounded-sm bg-cyan-500 sm:h-6 md:h-8 lg:h-10",
          cursorClassName,
        )}
        aria-hidden
      />
    </div>
  );
}
