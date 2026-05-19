"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export type AdminMenuUser = {
  email: string;
  name?: string;
  isAdmin: boolean;
};

// Hover-trigger Admin tab. Click goes to the hub's /admin page.
// Hover reveals the user list — click any user to "Preview as" them.

export function AdminTabMenu({
  href,
  users,
  impersonating,
  effectiveEmail,
  selected,
}: {
  href: string;
  users: AdminMenuUser[];
  impersonating: boolean;
  effectiveEmail: string;
  selected: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function deferClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function previewAs(email: string) {
    setBusy(email);
    await fetch("/api/admin/impersonate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(null);
    setOpen(false);
    router.refresh();
  }

  async function stopPreview() {
    setBusy("__stop__");
    await fetch("/api/admin/impersonate", {
      method: "DELETE",
      credentials: "same-origin",
    });
    setBusy(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div
      className="relative ml-auto"
      onMouseEnter={openMenu}
      onMouseLeave={deferClose}
      onFocus={openMenu}
      onBlur={deferClose}
    >
      <Link
        href={href}
        className={cn(
          "relative flex items-center gap-1.5 whitespace-nowrap rounded-none px-3 py-3 text-sm font-medium transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50",
          selected
            ? "text-gold-deep dark:text-gold-soft"
            : "text-gold/80 hover:text-gold-deep dark:text-gold-soft/80 dark:hover:text-gold-soft",
        )}
        aria-current={selected ? "page" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Admin
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("h-3 w-3 opacity-70 transition-transform", open && "rotate-180")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {selected && (
          <motion.span
            layoutId="active-tab-underline"
            className="absolute inset-x-2 -bottom-px h-[2px] bg-gold"
            transition={{ type: "tween", duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </Link>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Preview as user
              </span>
              {impersonating && (
                <button
                  type="button"
                  onClick={stopPreview}
                  disabled={busy === "__stop__"}
                  className="text-[10px] font-medium uppercase tracking-wider text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
                >
                  Stop ({busy === "__stop__" ? "…" : "exit"})
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {users.length === 0 ? (
                <div className="px-3 py-3 text-xs text-zinc-500">No users yet.</div>
              ) : (
                users.map((u) => {
                  const previewing = impersonating && effectiveEmail === u.email;
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => previewAs(u.email)}
                      disabled={busy === u.email}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                        previewing
                          ? "bg-amber-50 text-zinc-900 dark:bg-amber-950/40 dark:text-zinc-100"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                      )}
                      role="menuitem"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {u.name || u.email.split("@")[0]}
                        </div>
                        <div className="truncate font-mono text-[10.5px] text-zinc-500 dark:text-zinc-400">
                          {u.email}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {u.isAdmin && (
                          <span className="rounded-full border border-emerald-300 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                            admin
                          </span>
                        )}
                        {previewing && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            viewing
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-900">
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                Open Admin page →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
