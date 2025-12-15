"use client";
import { cn } from "@/lib/utils";
import type { Transition, Variants } from "framer-motion";
import { easeInOut, motion, useReducedMotion } from "framer-motion";
import React, { useMemo } from "react";

type BackgroundGradientProps = {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
  duration?: number; // default 5
  colorsClass?: string;
};

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
  duration = 5,
  colorsClass = "bg-[radial-gradient(circle_farthest-side_at_0_100%,#00ccb1,transparent),radial-gradient(circle_farthest-side_at_100%_0,#7b61ff,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#ffc414,transparent),radial-gradient(circle_farthest-side_at_0_0,#1ca0fb,#141316)]",
}: BackgroundGradientProps) => {
  const reduce = useReducedMotion();

  const variants: Variants = useMemo(
    () => ({
      initial: { backgroundPosition: "0% 50%" },
      animate: { backgroundPosition: ["0% 50%", "100% 50%"] },
    }),
    [],
  );

  const transition: Transition | undefined =
    animate && !reduce
      ? {
          duration,
          repeat: Infinity,
          repeatType: "reverse", // ping-pong
          ease: easeInOut, // <- fungsi easing, bukan string
        }
      : undefined;

  const sharedMotionProps = {
    variants: animate && !reduce ? variants : undefined,
    initial: animate && !reduce ? "initial" : undefined,
    animate: animate && !reduce ? "animate" : undefined,
    transition,
    style: {
      backgroundSize: animate && !reduce ? "400% 400%" : undefined,
      willChange: "background-position",
    } as React.CSSProperties,
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-[4px]",
        containerClassName,
      )}
    >
      {/* Glow (blur) */}
      <motion.div
        {...sharedMotionProps}
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] opacity-60 blur-xl transition-opacity duration-500 group-hover:opacity-100",
          colorsClass,
        )}
        aria-hidden={true}
      />
      {/* Solid gradient */}
      <motion.div
        {...sharedMotionProps}
        className={cn(
          "pointer-events-none absolute inset-0 z-[2]",
          colorsClass,
        )}
        aria-hidden={true}
      />

      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};
