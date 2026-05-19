"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HUBS, type HubId } from "@/lib/hubs";
import { HubIcon } from "@/components/hub-icon";
import { useHubNavigation } from "@/components/hub-transition";
import { cn } from "@/lib/utils";

// Dropdown layout — Dashboard sits at the top on its own, then categorized
// groups. Categories with no available hubs are skipped entirely.
type Group = { label: string | null; hubs: HubId[] };
const HUB_GROUPS: Group[] = [
  { label: null, hubs: ["dashboard"] },
  { label: "Lead Gen", hubs: ["atlas", "sales"] },
  { label: "Closing", hubs: ["closing"] },
  { label: "Systems", hubs: ["leads"] },
  { label: "Capital", hubs: ["investing"] },
];

// On-page brand area: [logo] Entheios / [HubName]
// For users with >1 hub access, the brand is a button that opens a dropdown.
// Dropdown items drop the "Entheios" prefix and use a colored icon + hub
// name in the hub's accent color.

export function HubSwitcher({
  currentHub,
  availableHubs,
}: {
  currentHub: HubId | null;
  availableHubs: HubId[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { start } = useHubNavigation();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hub = currentHub ? HUBS[currentHub] : null;
  const canSwitch = availableHubs.length > 1;

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        disabled={!canSwitch}
        className={cn(
          // -ml-2 cancels the button's px-2 so the brand text lines up with
          // the page content's left edge (and the tab row below).
          "group -ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold tracking-tight",
          "text-zinc-900 dark:text-zinc-100",
          !canSwitch && "cursor-default",
        )}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
      >
        <span>Entheios</span>
        {hub && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span>{hub.label}</span>
          </>
        )}
        {canSwitch && (
          <span
            className={cn(
              "ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
              "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900",
              open && "bg-zinc-100 dark:bg-zinc-900",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "h-3 w-3 text-zinc-400 transition-transform",
                open && "rotate-180",
              )}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10"
            role="menu"
          >
            {HUB_GROUPS.map((group, gi) => {
              const visible = group.hubs.filter((id) => availableHubs.includes(id));
              if (visible.length === 0) return null;
              return (
                <div
                  key={group.label ?? "_top"}
                  className={cn(gi > 0 && "mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-900")}
                >
                  {group.label && (
                    <div className="px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {group.label}
                    </div>
                  )}
                  {visible.map((id) => {
                    const h = HUBS[id];
                    const active = id === currentHub;
                    return (
                      <Link
                        key={id}
                        href={h.defaultPath}
                        onClick={() => {
                          setOpen(false);
                          start(id);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300",
                          active
                            ? "bg-zinc-100 dark:bg-zinc-900"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                        )}
                        role="menuitem"
                      >
                        <HubIcon id={id} className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{h.label}</span>
                        {active && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-auto h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
