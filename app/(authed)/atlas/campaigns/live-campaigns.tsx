"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Campaign, ScriptFolder } from "@/lib/types";
import { getCumulativeSends, COST_PER_SMS } from "@/lib/dashboard-sample";
import { cn } from "@/lib/utils";

// Twilio wallet starting balance. The displayed balance
// = STARTING - (cumulative sends × COST_PER_SMS), clamped at zero.
const WALLET_STARTING_BALANCE = 1_900;

export function LiveCampaigns({
  campaigns,
  folders,
  highlightId,
  onUpdate,
  onDelete,
}: {
  campaigns: Campaign[];
  folders: ScriptFolder[];
  highlightId: string | null;
  onUpdate: (id: string, patch: Partial<Campaign>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tick the wallet read-out every 5s so the balance visibly drips down as
  // sends accrue, without spamming re-renders.
  const [walletBalance, setWalletBalance] = useState(() =>
    computeWalletBalance(),
  );
  useEffect(() => {
    const id = setInterval(() => setWalletBalance(computeWalletBalance()), 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Live campaigns
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {campaigns.filter((c) => c.status === "running").length} running ·{" "}
            {campaigns.filter((c) => c.status === "paused").length} paused
          </span>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No campaigns yet. Create one above.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {campaigns.map((c) => {
            const folder = folders.find((f) => f.id === c.scriptFolderId);
            const isEditing = editingId === c.id;
            const highlight = highlightId === c.id;
            return (
              <motion.li
                key={c.id}
                layout
                animate={{
                  backgroundColor: highlight
                    ? "rgba(16,185,129,0.06)"
                    : "rgba(0,0,0,0)",
                }}
                transition={{ duration: 0.5 }}
                className="px-6 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Toggle + name */}
                  <div className="flex items-start gap-3">
                    <Toggle
                      on={c.status === "running"}
                      onChange={(on) =>
                        onUpdate(c.id, { status: on ? "running" : "paused" })
                      }
                      label={`Toggle ${c.name}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {c.name}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-wide",
                            c.status === "running"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{folder?.name ?? "—"}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <span>{c.leadCount.toLocaleString()} leads</span>
                        {c.pauseReason && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">·</span>
                            <span className="text-amber-700 dark:text-amber-400">
                              {c.pauseReason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden grid-cols-3 gap-5 text-right sm:grid">
                    <div>
                      <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {c.sentToday}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        sent
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                        {c.replies}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        replies
                      </div>
                    </div>
                    <div>
                      <div
                        className={cn(
                          "font-mono text-sm",
                          c.optOuts > 10
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {c.optOuts}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        opt-outs
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : c.id)}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <div
                    className={cn(
                      "h-full transition-[width]",
                      c.status === "running"
                        ? "bg-zinc-900 dark:bg-zinc-100"
                        : "bg-amber-400 dark:bg-amber-500",
                    )}
                    style={{ width: `${Math.round(c.progress * 100)}%` }}
                  />
                </div>

                {/* Inline editor */}
                <AnimatePresence initial={false}>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[1fr_auto]">
                        <label className="text-xs">
                          <span className="block text-zinc-500 dark:text-zinc-400">
                            Script folder
                          </span>
                          <select
                            value={c.scriptFolderId}
                            onChange={(e) =>
                              onUpdate(c.id, { scriptFolderId: e.target.value })
                            }
                            className="mt-1 flex h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          >
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.templateCount} templates)
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs">
                          <span className="block text-zinc-500 dark:text-zinc-400">
                            Name
                          </span>
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) =>
                              onUpdate(c.id, { name: e.target.value })
                            }
                            className="mt-1 flex h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <span>Using current Twilio wallet</span>
        <span className="font-mono text-zinc-700 dark:text-zinc-300">
          Current funds: {formatUsd(walletBalance)}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40",
        on
          ? "bg-emerald-500"
          : "bg-zinc-300 dark:bg-zinc-700",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function computeWalletBalance(): number {
  const sends = getCumulativeSends();
  const remaining = WALLET_STARTING_BALANCE - sends * COST_PER_SMS;
  return Math.max(0, remaining);
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
