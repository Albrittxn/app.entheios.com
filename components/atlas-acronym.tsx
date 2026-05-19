"use client";

import { motion } from "motion/react";

// The "ATLAS" mark in the header expands on hover into its full meaning
// — "Adaptive Targeted Lead Acquisition System" — one tail per letter,
// with a small stagger so it unfolds left-to-right.

const LETTERS = ["A", "T", "L", "A", "S"] as const;
const TAILS = ["daptive", "argeted", "ead", "cquisition", "ystem"] as const;

const tailVariants = {
  collapsed: { maxWidth: 0, opacity: 0 },
  expanded: { maxWidth: "11rem", opacity: 1 },
};

const tailTransition = { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };

export function AtlasAcronym() {
  return (
    <motion.span
      className="hidden cursor-default select-none items-baseline whitespace-nowrap text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 sm:inline-flex"
      initial="collapsed"
      whileHover="expanded"
      transition={{ staggerChildren: 0.04 }}
      aria-label="Adaptive Targeted Lead Acquisition System"
      title="Adaptive Targeted Lead Acquisition System"
    >
      {LETTERS.map((letter, i) => (
        <span key={i} className="inline-flex items-baseline">
          <span>{letter}</span>
          <motion.span
            variants={tailVariants}
            transition={tailTransition}
            className="inline-block overflow-hidden whitespace-nowrap normal-case tracking-normal"
          >
            {TAILS[i]}
            {i < LETTERS.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
