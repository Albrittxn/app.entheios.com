"use client";

// Booked → Showed → Closed funnel. Each row is a bar that animates its
// width in on mount, plus a conversion % between stages.

import { motion } from "motion/react";

type Stage = { label: string; count: number };

export function FunnelChart({
  booked,
  showed,
  closed,
}: {
  booked: number;
  showed: number;
  closed: number;
}) {
  const stages: Stage[] = [
    { label: "Booked", count: booked },
    { label: "Showed", count: showed },
    { label: "Closed", count: closed },
  ];
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <ul className="space-y-3.5">
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        const prev = i > 0 ? stages[i - 1].count : null;
        const conv =
          prev !== null && prev > 0
            ? Math.round((s.count / prev) * 100)
            : null;
        return (
          <li
            key={s.label}
            className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4"
          >
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {s.label}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
              <motion.div
                initial={{ width: 0, opacity: 0.4 }}
                animate={{ width: `${pct}%`, opacity: 1 }}
                transition={{
                  duration: 0.95,
                  delay: 0.2 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
              />
            </div>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {s.count.toLocaleString()}
              </span>
              {conv !== null && (
                <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  {conv}%
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
