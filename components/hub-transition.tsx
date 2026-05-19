"use client";

// Client-side hub-transition overlay. The Next.js loading.tsx fires for hub
// route segments, but the content is often so fast you barely see it. This
// overlay is triggered explicitly when a hub Link is clicked, and stays
// visible for a minimum duration (so it actually registers) plus until the
// new pathname's first segment matches the target.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

const MIN_VISIBLE_MS = 550;

type NavCtx = {
  navigating: boolean;
  /** Call before/during a click that triggers a hub change. */
  start: (targetHub: string) => void;
};

const Ctx = createContext<NavCtx>({ navigating: false, start: () => {} });

export const useHubNavigation = () => useContext(Ctx);

export function HubNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const startedAt = useRef<number | null>(null);
  const targetHub = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start(target: string) {
    // If we're already on this hub, no overlay.
    const currentHub = (pathname || "").split("/").filter(Boolean)[0] ?? "";
    if (currentHub === target) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    startedAt.current = Date.now();
    targetHub.current = target;
    setNavigating(true);
  }

  // When the new pathname lands and matches the target hub, schedule hide
  // after min duration.
  useEffect(() => {
    if (!navigating || !targetHub.current) return;
    const currentHub = (pathname || "").split("/").filter(Boolean)[0] ?? "";
    if (currentHub !== targetHub.current) return;
    const elapsed = Date.now() - (startedAt.current ?? 0);
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimer.current = setTimeout(() => {
      setNavigating(false);
      targetHub.current = null;
      startedAt.current = null;
    }, remaining);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname, navigating]);

  // Safety: never let the overlay stick for more than 5s if something stalls.
  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 5000);
    return () => clearTimeout(t);
  }, [navigating]);

  return (
    <Ctx.Provider value={{ navigating, start }}>
      {children}
      <AnimatePresence>
        {navigating && (
          <motion.div
            key="hub-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-black/90"
            aria-live="polite"
            aria-label="Loading"
          >
            <div className="h-16 w-16 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
