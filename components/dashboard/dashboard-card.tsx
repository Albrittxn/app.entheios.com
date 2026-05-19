"use client";

// Motion-aware card wrapper for the Dashboard overview. Fades up on mount
// with a small upward translate — pass `delay` for staggered entrances.

import { motion } from "motion/react";

export function DashboardCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
