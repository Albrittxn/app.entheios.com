"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { HubSwitcher } from "@/components/hub-switcher";
import { HubTabNav } from "@/components/hub-tab-nav";
import { SettingsMenu } from "@/components/settings-menu";
import { HubNavigationProvider } from "@/components/hub-transition";
import { HUBS, HUB_ORDER, hubFromPathname, type HubId } from "@/lib/hubs";
import type { AdminMenuUser } from "@/components/admin-tab-menu";

type Props = {
  actorEmail: string;
  effectiveEmail: string;
  displayName: string;
  admin: boolean;
  impersonating: boolean;
  availableHubs: HubId[];
  adminUsersByHub: Partial<Record<HubId, AdminMenuUser[]>>;
  children: React.ReactNode;
};

export function AppShell({
  actorEmail,
  effectiveEmail,
  displayName,
  admin,
  impersonating,
  availableHubs,
  adminUsersByHub,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);
  const currentHub = hubFromPathname(pathname);
  const hub = currentHub ? HUBS[currentHub] : null;
  const accessible = HUB_ORDER.filter((id) => availableHubs.includes(id));

  async function stopPreview() {
    setStopping(true);
    await fetch("/api/admin/impersonate", {
      method: "DELETE",
      credentials: "same-origin",
    });
    setStopping(false);
    router.refresh();
  }

  return (
    <HubNavigationProvider>
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      {impersonating && (
        <div className="flex items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          </svg>
          <span>
            Previewing as{" "}
            <code className="font-mono">{effectiveEmail}</code>
          </span>
          <button
            type="button"
            onClick={stopPreview}
            disabled={stopping}
            className="rounded-md border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600 dark:bg-amber-950 dark:hover:bg-amber-900"
          >
            {stopping ? "Stopping…" : "Stop preview"}
          </button>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <HubSwitcher currentHub={currentHub} availableHubs={accessible} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Logo links to the current hub's first tab. Wrapper stays
                pointer-events-none so it doesn't block the header; the link
                itself opts back in. */}
            <Link
              href={hub ? (hub.tabs[0]?.href ?? hub.defaultPath) : "/"}
              aria-label="Hub home"
              className="pointer-events-auto inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50"
            >
              <motion.span
                className="inline-flex"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "tween", duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              >
                <Image
                  src="/logo.png"
                  alt="Entheios"
                  width={36}
                  height={36}
                  className="h-9 w-auto select-none dark:invert dark:brightness-200"
                  priority
                />
              </motion.span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:inline-flex"
              aria-label="Logged in user"
              title={actorEmail}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {displayName}
              {admin && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
                  admin
                </span>
              )}
            </span>
            <SettingsMenu />
          </div>
        </div>
        {hub && hub.tabs.length > 0 && (
          <HubTabNav
            tabs={hub.tabs}
            showAdmin={admin}
            adminUsers={(currentHub && adminUsersByHub[currentHub]) || []}
            impersonating={impersonating}
            effectiveEmail={effectiveEmail}
          />
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
    </HubNavigationProvider>
  );
}
