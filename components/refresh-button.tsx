"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Re-runs the current server component tree (re-fetches data, re-renders).
// While the refresh is in flight we spin the icon and disable the button so
// rapid double-clicks don't queue up multiple refreshes.
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function handleClick() {
    startTransition(() => {
      router.refresh();
      // Show a brief "spinning" state even if the refresh resolves instantly,
      // so the user gets feedback that the click was registered.
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 500);
    });
  }

  const spinning = isPending || justRefreshed;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Refresh"
      title="Refresh dashboard"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-4 w-4 transition-transform", spinning && "animate-spin")}
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );
}
