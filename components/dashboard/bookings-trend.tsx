"use client";

// 30-day bookings trend — an SVG area chart that draws itself in. The fill
// fades up and the line strokes from left to right. Uses currentColor so it
// inherits light/dark mode from the parent text color.

import { motion } from "motion/react";

type Point = { date: string; count: number };

export function BookingsTrend({ data }: { data: Point[] }) {
  const W = 800;
  const H = 220;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const baseline = padTop + innerH;

  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + (1 - d.count / max) * innerH,
    ...d,
  }));

  const linePath =
    points.length === 0
      ? ""
      : points
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          )
          .join(" ");

  const areaPath =
    points.length === 0
      ? ""
      : `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baseline} L ${points[0].x.toFixed(1)},${baseline} Z`;

  const total = data.reduce((acc, d) => acc + d.count, 0);
  // Label every ~5th day so the axis isn't a wall of text.
  const labels = data.map((d, i) => ({
    x: padX + i * stepX,
    text: i % 5 === 0 || i === data.length - 1 ? labelFor(d.date) : "",
  }));

  return (
    <div className="relative w-full">
      <div className="absolute right-0 top-0 text-[11px] text-zinc-400 dark:text-zinc-500">
        {total} {total === 1 ? "booking" : "bookings"} · last {data.length} days
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full text-zinc-900 dark:text-zinc-100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Bookings over the last 30 days"
      >
        <defs>
          <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Faint horizontal gridlines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={W - padX}
            y1={padTop + innerH * p}
            y2={padTop + innerH * p}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeDasharray="3 5"
            className="text-zinc-500"
          />
        ))}

        {points.length > 0 && (
          <>
            <motion.path
              d={areaPath}
              fill="url(#goldFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            />
            {points.map((p, i) => (
              <motion.circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={p.count > 0 ? 3 : 0}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.9 + i * 0.012,
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </>
        )}

        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            className="fill-zinc-400 dark:fill-zinc-600"
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

function labelFor(iso: string): string {
  // "YYYY-MM-DD" → "MMM d" in UTC (no timezone drift).
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
