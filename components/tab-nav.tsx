"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

// Order: shared tabs first, Settings last in the shared group, then Admin
// pinned right (admin-only, shown when `showAdmin` is true).
const TABS: { id: string; href: string; label: string }[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "leads", href: "/leads", label: "Leads" },
  { id: "campaigns", href: "/campaigns", label: "Campaigns" },
  { id: "scripts", href: "/scripts", label: "Scripts" },
  { id: "updates", href: "/updates", label: "Updates" },
  { id: "settings", href: "/settings", label: "Settings" },
];

export function TabNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = showAdmin
    ? [...TABS, { id: "admin", href: "/admin", label: "Admin" }]
    : TABS;

  return (
    <nav
      aria-label="Primary"
      className="border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map((t) => {
          const selected =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.id}
              href={t.href}
              className={cn(
                "relative whitespace-nowrap rounded-none px-3 py-3 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
                selected
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
                t.id === "admin" &&
                  "ml-auto text-emerald-700 dark:text-emerald-300",
              )}
              aria-current={selected ? "page" : undefined}
            >
              {t.label}
              {selected && (
                <motion.span
                  layoutId="active-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-zinc-900 dark:bg-zinc-100"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
