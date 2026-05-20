"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Tab } from "@/lib/hubs";
import { AdminTabMenu, type AdminMenuUser } from "@/components/admin-tab-menu";

// Prop-driven tab nav. Renders the sliding underline (Framer Motion
// layoutId) — admin tabs render as a hover-menu so admin can quickly
// "Preview as" any user from anywhere.

export function HubTabNav({
  tabs,
  showAdmin,
  adminUsers,
  impersonating,
  effectiveEmail,
}: {
  tabs: Tab[];
  showAdmin: boolean;
  adminUsers: AdminMenuUser[];
  impersonating: boolean;
  effectiveEmail: string;
}) {
  const pathname = usePathname();
  const visible = tabs.filter((t) => !t.adminOnly || showAdmin);
  const selectedHref =
    visible
      .filter((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const isSelected = (href: string) => selectedHref === href;

  // The Admin tab is kept OUT of the horizontally-scrollable strip — an
  // overflow container clips on both axes, which would cut off the Admin
  // hover dropdown. Regular tabs scroll; the Admin menu sits in the
  // non-clipping outer flex.
  const regularTabs = visible.filter((t) => !t.adminOnly);
  const adminTab = visible.find((t) => t.adminOnly);

  return (
    <nav
      aria-label="Primary"
      className="border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="mx-auto flex max-w-7xl items-stretch px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {regularTabs.map((t) => {
            const selected = isSelected(t.href);
            return (
              <Link
                key={t.id}
                href={t.href}
                className={cn(
                  // first:-ml-3 cancels the leading tab's px-3 so its label
                  // lines up with the brand and the page content's left edge.
                  "relative whitespace-nowrap rounded-none px-3 py-3 text-sm font-medium transition-colors first:-ml-3",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
                  selected
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
                )}
                aria-current={selected ? "page" : undefined}
              >
                {t.label}
                {selected && (
                  <motion.span
                    layoutId="active-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-[2px] bg-gold"
                    transition={{ type: "tween", duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        {adminTab && (
          <AdminTabMenu
            href={adminTab.href}
            users={adminUsers}
            impersonating={impersonating}
            effectiveEmail={effectiveEmail}
            selected={isSelected(adminTab.href)}
          />
        )}
      </div>
    </nav>
  );
}
