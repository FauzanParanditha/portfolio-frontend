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
  const [phase, setPhase] = useState<
    "idle" | "typing" | "pausing" | "deleting"
  >("idle");
  const [stopped, setStopped] = useState(false);

  // Kickoff
  useEffect(() => {
    if (!items.length) return;
    if (reduce) {
      setPhase("idle");
      setSub(items[0].text.length);
      return;
    }
    const t = setTimeout(() => setPhase("typing"), startDelay);
    return () => clearTimeout(t);
  }, [items, reduce, startDelay]);

  // Mesin state: typing → pausing → deleting → next
  useEffect(() => {
    if (!items.length || reduce || stopped) return;
    const current = items[index]?.text ?? "";

    let t: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (sub < current.length) {
        t = setTimeout(() => setSub((s) => s + 1), typingSpeed);
      } else {
        setPhase("pausing");
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), pauseBetween);
    } else if (phase === "deleting") {
      if (sub > 0) {
        t = setTimeout(() => setSub((s) => s - 1), deletingSpeed);
      } else {
        const next = index + 1;
        if (!loop && next >= items.length) {
          setStopped(true); // berhenti di akhir daftar
          setPhase("idle");
          return;
        }
        setIndex((i) => (i + 1) % items.length);
        setPhase("typing");
      }
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
