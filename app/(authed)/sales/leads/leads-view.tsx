"use client";

import { useEffect, useState, useCallback } from "react";

type UserBatchStatus = { downloaded_at?: number; completed_at?: number };
type BatchRow = {
  id: string;
  name: string;
  lead_count: number;
  columns: string[];
  created_at: number;
  created_by: string;
  status?: UserBatchStatus;
};

type Filter = "all" | "pending" | "downloaded" | "complete";

function uiStatus(b: BatchRow): "pending" | "downloaded" | "complete" {
  if (b.status?.completed_at) return "complete";
  if (b.status?.downloaded_at) return "downloaded";
  return "pending";
}

export function SalesLeadsView() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/sales/batches", { credentials: "same-origin" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      const j = (await r.json()) as { batches: BatchRow[] };
      setBatches(j.batches);
      setLoading(false);
    } catch {
      setError("Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setComplete(id: string, completed: boolean) {
    const r = await fetch(`/api/sales/batches/${encodeURIComponent(id)}/complete`, {
      method: completed ? "POST" : "DELETE",
      credentials: "same-origin",
    });
    if (!r.ok) return;
    const j = (await r.json()) as { status: UserBatchStatus };
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: j.status } : b)),
    );
  }

  function onDownload(b: BatchRow) {
    // Optimistically set downloaded so the row pills update without waiting
    setBatches((prev) =>
      prev.map((x) =>
        x.id === b.id
          ? {
              ...x,
              status: {
                ...x.status,
                downloaded_at: x.status?.downloaded_at ?? Date.now(),
              },
            }
          : x,
      ),
    );
  }

  const counts: Record<Filter, number> = {
    all: batches.length,
    pending: batches.filter((b) => uiStatus(b) === "pending").length,
    downloaded: batches.filter((b) => uiStatus(b) === "downloaded").length,
    complete: batches.filter((b) => uiStatus(b) === "complete").length,
  };

  const visible = batches.filter((b) => filter === "all" || uiStatus(b) === filter);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
        Failed to load batches: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "downloaded", "complete"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="capitalize">{f}</span>
              <span className="font-mono text-[10px] opacity-70">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : !visible.length ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          {batches.length === 0
            ? "No batches yet. Admin can upload one in the Admin tab."
            : "No batches in this view."}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((b) => {
            const s = uiStatus(b);
            const dt = new Date(b.created_at).toISOString().slice(0, 10);
            return (
              <div
                key={b.id}
                className={`grid grid-cols-1 items-center gap-3 rounded-lg border p-4 sm:grid-cols-[1.4fr_auto_auto_auto] ${
                  s === "complete"
                    ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {b.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    added {dt}
                    {b.status?.completed_at
                      ? ` · done ${new Date(b.status.completed_at).toISOString().slice(0, 10)}`
                      : b.status?.downloaded_at
                      ? ` · pulled ${new Date(b.status.downloaded_at).toISOString().slice(0, 10)}`
                      : ""}
                  </div>
                </div>
                <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {b.lead_count} leads
                </div>
                <StatusPill s={s} />
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/sales/batches/${encodeURIComponent(b.id)}/csv`}
                    onClick={() => onDownload(b)}
                    className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    download
                  >
                    Download CSV
                  </a>
                  {s === "complete" ? (
                    <button
                      type="button"
                      onClick={() => setComplete(b.id, false)}
                      className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setComplete(b.id, true)}
                      className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Mark complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ s }: { s: "pending" | "downloaded" | "complete" }) {
  const labels = { pending: "Pending", downloaded: "Downloaded", complete: "Complete" } as const;
  const classes = {
    pending:
      "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    downloaded:
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    complete:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  } as const;
  return (
    <span
      className={`inline-flex justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classes[s]}`}
    >
      {labels[s]}
    </span>
  );
}
