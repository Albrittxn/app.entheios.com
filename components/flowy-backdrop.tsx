"use client";

// 1:1 port of the entheios.com hero animation (also used on
// teams.entheios.com login). No central halo — waves drift across the
// whole viewport.

import { motion, useReducedMotion } from "motion/react";

export function FlowyBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="relative h-full w-full">
        <Wave y={6} height={48} fill="rgba(150, 142, 122, 0.55)" blur={22} duration={7} reduce={!!reduce} />
        <Wave y={26} height={50} fill="rgba(120, 113, 96, 0.5)" blur={28} duration={10} reverse reduce={!!reduce} />
        <Wave y={48} height={50} fill="rgba(95, 89, 76, 0.45)" blur={32} duration={13} reduce={!!reduce} />
        <Wave y={66} height={45} fill="rgba(135, 128, 110, 0.55)" blur={24} duration={8} reverse reduce={!!reduce} />

        {/* Grain — analog texture on top of everything */}
        <div className="absolute inset-0 grain-live" />
      </div>
    </div>
  );
}

function Wave({
  y,
  height,
  fill,
  blur,
  duration,
  reverse = false,
  reduce,
}: {
  y: number; // top, in % of viewport
  height: number; // height, in % of viewport
  fill: string;
  blur: number;
  duration: number;
  reverse?: boolean;
  reduce: boolean;
}) {
  return (
    <motion.svg
      className="absolute left-0 will-change-transform"
      style={{
        top: `${y}%`,
        width: "200vw",
        height: `${height}%`,
        filter: `blur(${blur}px)`,
      }}
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      initial={{ x: reverse ? "-100vw" : 0 }}
      animate={
        reduce ? undefined : { x: reverse ? ["-100vw", "0vw"] : ["0vw", "-100vw"] }
      }
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <path
        d="M 0,50 Q 25,30 50,50 Q 75,70 100,50 Q 125,30 150,50 Q 175,70 200,50 L 200,100 L 0,100 Z"
        fill={fill}
      />
    </motion.svg>
  );
}
