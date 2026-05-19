"use client";

// A number that eases up from 0 to `value` on mount — used by the dashboard
// KPI cards. Same easing curve (cubic-bezier .22 / 1 / .36 / 1) as the rest
// of the app, so it feels of-a-piece with the page entrance.
//
// `mode` is a string (not a formatter function) on purpose: the page is a
// server component and can't pass functions across the RSC boundary.

import { animate } from "motion/react";
import { useEffect, useState } from "react";

type Mode = "integer" | "percent";

export function AnimatedCounter({
  value,
  mode = "integer",
  duration = 1.1,
  delay = 0,
}: {
  value: number;
  mode?: Mode;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, delay]);

  return (
    <>
      {mode === "percent"
        ? `${Math.round(display * 100)}%`
        : Math.round(display).toLocaleString()}
    </>
  );
}
