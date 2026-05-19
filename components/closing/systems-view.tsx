"use client";

// Closing → Systems. Wraps the markdown content with the Payment Contract
// card at the top (or bottom, once signed). Click the card to swap into the
// full contract form; "Back" returns to the markdown index.
//
// Completion is recorded in localStorage keyed by closer email so each
// closer's contract state is tracked independently on shared machines.

import { useEffect, useState } from "react";
import { PaymentContract } from "@/components/closing/payment-contract";
import { ProseMarkdown } from "@/components/prose-markdown";
import { cn } from "@/lib/utils";

const CONTRACT_STORAGE_PREFIX = "payment-contract-signed:";

export function SystemsView({
  setupMarkdown,
  markdown,
  closerEmail,
  closerName,
}: {
  // Onboarding / setup checklist (formerly the standalone Settings tab),
  // consolidated here as the lead-in to the operational SOP.
  setupMarkdown: string;
  markdown: string;
  closerEmail: string;
  closerName: string;
}) {
  const [view, setView] = useState<"index" | "payment-contract">("index");
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const key = closerEmail ? `${CONTRACT_STORAGE_PREFIX}${closerEmail.toLowerCase()}` : "";

  useEffect(() => {
    if (!key) return;
    try {
      const v = localStorage.getItem(key);
      if (v) {
        setCompleted(true);
        setCompletedAt(v);
      }
    } catch {}
  }, [key]);

  function markContractCompleted() {
    if (!key) return;
    const iso = new Date().toISOString();
    try {
      localStorage.setItem(key, iso);
    } catch {}
    setCompleted(true);
    setCompletedAt(iso);
  }

  if (view === "payment-contract") {
    return (
      <PaymentContract
        initialName={closerName}
        email={closerEmail}
        onBack={() => setView("index")}
        onDownloaded={markContractCompleted}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ProseMarkdown source={setupMarkdown} />
      {/* Sits directly under Set Up → Step 3. Stays put whether signed or
          not — just switches to a completed state in place. */}
      <PaymentContractCard
        onClick={() => setView("payment-contract")}
        completed={completed}
        completedAt={completedAt}
      />
      <ProseMarkdown source={markdown} />
    </div>
  );
}

function PaymentContractCard({
  onClick,
  completed = false,
  completedAt = null,
}: {
  onClick: () => void;
  completed?: boolean;
  completedAt?: string | null;
}) {
  return (
    <button
      type="button"
      id="payment-contract-card"
      onClick={onClick}
      className={cn(
        "group flex w-full max-w-4xl scroll-mt-28 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        completed
          ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/15"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          completed
            ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        )}
      >
        {completed ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment Contract</h3>
          {completed && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
              Completed
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {completed
            ? `Signed${completedAt ? ` ${formatCompletedDate(completedAt)}` : ""} — click to review or re-download.`
            : "Independent contractor payout agreement — review, sign, download."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-center text-xs font-medium text-zinc-600 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
        {completed ? "Review" : "Open"}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
          <path d="M5 10h10M11 6l4 4-4 4" />
        </svg>
      </div>
    </button>
  );
}

function formatCompletedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
