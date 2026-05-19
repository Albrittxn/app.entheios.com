"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { DailySends } from "@/lib/types";
import { cn } from "@/lib/utils";

type Range = "today" | "7d" | "30d";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

export function SendsPanel({
  data,
  totalSpent,
  costPerCallBooked,
}: {
  data: DailySends;
  totalSpent: number;
  costPerCallBooked: number;
}) {
  const [range, setRange] = useState<Range>("today");
  const value =
    data[range === "today" ? "today" : range === "7d" ? "last7d" : "last30d"];
  const subline =
    range === "today"
      ? "today"
      : range === "7d"
        ? "last 7 days"
        : "last 30 days";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Texts sent
          </h2>
          <div
            role="radiogroup"
            aria-label="Time range"
            className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
          >
            {RANGES.map((r) => {
              const active = range === r.id;
              return (
                <button
                  key={r.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRange(r.id)}
                  className={cn(
                    "relative rounded px-2 py-0.5 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
                    active
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sends-range-pill"
                      className="absolute inset-0 rounded bg-white shadow-sm dark:bg-zinc-950"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-5 py-5">
        <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {value === 0 ? "—" : value.toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subline}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Total spent
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatUsd(totalSpent)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Cost / call booked
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {costPerCallBooked > 0 ? formatUsd(costPerCallBooked) : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
